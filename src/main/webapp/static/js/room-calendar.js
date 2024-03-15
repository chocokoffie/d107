async function fetchJSON(url) {
    const response = await fetch(url);
    return await response.json();
}

const myTimeFormat = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    meridiem: false
}
const groupFullNames = {
    "BFV1": "Bioinformatics Year 1",
    // "BFV1 gr1": "Bioinformatics Elective Module Lab Skills",
    // "BFV1 gr2": "Bioinformatics Elective Module Octave",
    "BFV2": "Bioinformatics Year 2",
    "BFV3": "Bioinformatics Year 3",
    // "BFV3 gr1": "Bioinformatics Minor HTHPC",
    // "BFV3 gr2": "Bioinformatics Minor Application Design",
    "BFVB3": "Minor Bioinformatics for the Life Sciences",
    "BFVF3": "Minor Voeding en Gezondheid",
    "DSLSR1": "Master Data Science for Life Sciences Year 1",
    "DSLSR2": "Master Data Science for Life Sciences Year 2",
}
const coolRooms = {
    11367: "ZP11/D1.07",
    11368: "ZP11/D1.08",
    11388: "ZP11/H1.122",
    11398: "ZP11/H1.86",
    11399: "ZP11/H1.88A",
};

$(document).ready(async function () {
    // Get all calendar event and modal elements
    const section = document.querySelector("#modal-section"),
        overlay = document.querySelector(".overlay"),
        closeBtn = document.querySelector(".modal-close-btn"),
        modalEventTitle = document.querySelector("#modal-event-title"),
        modalEventTime = document.querySelector("#modal-event-time"),
        modalEventGroups = document.querySelector("#modal-event-groups"),
        modalEventLecturers = document.querySelector("#modal-event-lecturers"),
        modalEventRooms = document.querySelector("#modal-event-rooms");

    overlay.addEventListener("click", () =>
        section.classList.remove("active")
    );
    closeBtn.addEventListener("click", () =>
        section.classList.remove("active")
    );

    // Fetch calendar events/items
    // const allItems = await fetchJSON("/api/get-all-calendar-items");
    const onlyCoolRoomsObject = await fetchJSON("/api/get-only-cool-rooms-calendar-items/");

    // Create calendar
    let calendarEl;
    let calendar;
    calendarEl = document.getElementById("calendar");
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "timeGridWeek",
        weekends: false,
        allDaySlot: false,
        nowIndicator: true,
        slotMinTime: "08:30:00",
        slotMaxTime: "20:00:00",
        buttonText: {today: "Current Week"},
        titleFormat: "{{dd MMMM yyyy}} '(Week 'WW')'",
        dayHeaderFormat: "EEE dd/MM",
        slotLabelFormat: myTimeFormat,
        eventTimeFormat: myTimeFormat,
        validRange: onlyCoolRoomsObject.dateRange,
        headerToolbar: {
            left: "",
            center: "title",
            right: "today prev,next"
        },
        events: onlyCoolRoomsObject.items,
        eventColor: "#6339cc",
        eventDidMount: function(arg) {
            let eventStartTime = luxon.DateTime.fromJSDate(arg.event.start)
            let eventEndTime = luxon.DateTime.fromJSDate(arg.event.end)
            let durationInHours = eventEndTime.diff(eventStartTime, ["hours"]).toObject().hours

            // Return early if the event's duration is very short because no additional information will fit
            if (durationInHours < 1) { return }

            // Collect current event element
            let contentsEl = arg.el.querySelector(".fc-event-title-container");

            // Add event groups information
            let groupEl = document.createElement("div")
            groupEl.classList.add("event-group");
            groupEl.innerHTML = arg.event.extendedProps.groups.join(", ");
            contentsEl.appendChild(groupEl);

            // Below a duration of 1.5 hours lecturer information will not fit inside the event element
            if (durationInHours < 1.5) { return }

            // Create event lecturer information element
            let eventLecturers = arg.event.extendedProps.lecturers
            let lecturersDivEl = document.createElement("div");
            lecturersDivEl.classList.add("event-lecturers");

            // If the duration is less than 1 hour and 45 minutes only 1 lecturer can be shown
            if (durationInHours < 1.75 && eventLecturers.length > 1) {
                let lecturerEl = document.createElement("i");
                lecturerEl.innerHTML = `Multiple lecturers (${eventLecturers.length})`;
                lecturersDivEl.appendChild(lecturerEl);
                contentsEl.appendChild(lecturersDivEl);
                return
            }

            // Define the amount of lecturers that can be shown for specific duration breakpoints
            let lecturersShown;
            if (durationInHours <= 1.75 && eventLecturers.length > 2) {
                lecturersShown = 1;
            } else if (durationInHours <= 2 && eventLecturers.length > 3) {
                lecturersShown = 2;
            } else if (eventLecturers.length > 4) {
                lecturersShown = 3;
            } else {
                lecturersShown = 4;
            }

            // Add the lecturers that can be shown
            for (let index = 0; index < Math.min(eventLecturers.length, lecturersShown); index++) {
                let lecturerEl = document.createElement("i");
                lecturerEl.innerHTML = eventLecturers[index];
                lecturersDivEl.appendChild(lecturerEl);
            }
            // eventLecturers.splice(0, lecturersShown).forEach(function (lecturer) {
            //     let lecturerEl = document.createElement("i");
            //     lecturerEl.innerHTML = lecturer;
            //     lecturersDivEl.appendChild(lecturerEl);
            // });
            // If needed, notify that there are more lecturers not shown
            if (lecturersShown < eventLecturers.length) {
                let moreLecturersEl = document.createElement("i");
                moreLecturersEl.innerHTML = `and ${eventLecturers.length - lecturersShown} more...`;
                lecturersDivEl.appendChild(moreLecturersEl);
            }
            // Finish up
            contentsEl.appendChild(lecturersDivEl);
        },
        eventClick: function(info) {
            section.classList.add("active");

            // Title and time
            modalEventTitle.innerHTML = info.event.title;
            let startString = luxon.DateTime.fromJSDate(info.event.start).toFormat("dd MMMM yyyy HH:mm");
            let endString = luxon.DateTime.fromJSDate(info.event.end).toFormat("HH:mm");
            modalEventTime.innerHTML = `${startString} - ${endString}`;

            // Groups
            modalEventGroups.innerHTML = "";
            for (const group of info.event.extendedProps.groups) {
                modalEventGroups.innerHTML += `<div>${group} (${groupFullNames[group]})</div>`
            }

            // Lecturers
            modalEventLecturers.innerHTML = "";
            for (const lecturer of info.event.extendedProps.lecturers) {
                modalEventLecturers.innerHTML += `<div>${lecturer}</div>`
            }

            // Rooms
            modalEventRooms.innerHTML = "";
            for (const roomId of info.event.extendedProps.rooms) {
                modalEventRooms.innerHTML += `<div>${coolRooms[roomId]}</div>`
            }
        },
    })
    calendar.render();

    // Create room selection element and add change listener
    const roomSelect = document.createElement("select");
    roomSelect.id = "room-select";
    roomSelect.addEventListener("change", () => {
        const selectedRoom = roomSelect.value;
        calendar.getEvents().forEach(calendarEvent => {
            let eventRooms = calendarEvent.extendedProps.rooms.map(roomId => roomId.toString());
            if (eventRooms.includes(selectedRoom)) {
                calendarEvent.setProp("display", "auto");
            } else {
                calendarEvent.setProp("display", "none");
            }
        });
    });

    // Add an option for each room
    for (const [roomId, roomName] of Object.entries(coolRooms)) {
        const option = document.createElement("option");
        option.textContent = roomName;
        option.value = roomId;
        roomSelect.appendChild(option);
    }

    // Add the roomSelect element to the left div of the header toolbar
    const headerToolbar = calendarEl.firstChild;
    headerToolbar.firstChild.appendChild(roomSelect);
    // Trigger filter for page load
    roomSelect.dispatchEvent(new Event("change"));

    // Add manual update note with last update time
    let updateNoteEl = document.querySelector("#update-note");
    let lastUpdateTime = luxon.DateTime.fromISO(onlyCoolRoomsObject.gatherDate).toFormat("dd MMMM yyyy 'at' HH:mm:ss");
    updateNoteEl.innerHTML = `Note: Calendar data is updated manually. Last update: <u>${lastUpdateTime}</u>`;
});
