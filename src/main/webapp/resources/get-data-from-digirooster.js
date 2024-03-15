// Made by Vincent Talen
// Makes requests to the Digirooster API to get events for BIN classes/rooms
//
// Use by going to the Digirooster website and logging in, then use inspect element and paste this entire script in the console.
// A popup for a file download should appear shortly after running the code in the console.

// =====================================================================================================
// =========================================== FUNCTIONS ===============================================
// =====================================================================================================
function setToMonday(date) {
    let day = date.getDay() || 7;
    if (day !== 1)
        date.setHours(-24 * (day - 1));
    return date;
}

function toUTCString(date) {
    return date.toISOString().split(".", 1)[0];
}

function getDateRange() {
    // The amount of weeks in the future calendar events should be collected for
    let amountOfWeeks = 8;
    // Monday of past week
    let start = setToMonday(new Date());
    start.setHours(2, 0, 0, 0);
    start.setDate(start.getDate() - 7)
    // Monday x amount of weeks from now
    let end = new Date(start);
    end.setDate(end.getDate() + amountOfWeeks * 7);
    // Return UTC strings
    return {start: toUTCString(start), end: toUTCString(end)};
}

async function doRequest(requestUrl, requestData) {
    return $.ajax({
        url: requestUrl,
        method: "POST",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify(requestData),
    });
}


async function sendDigiroosterRequest(urlPath, year) {
    const baseURL = "https://digirooster.hanze.nl/API/Schedule/";
    const requestData = {
        sources: ["2", "1"],
        year: year,
        schoolId: "14",
        rangeStart: getDateRange().start,
        rangeEnd: getDateRange().end,
        storeSelection: true,
        includePersonal: false,
        includeConnectingRoomInfo: true
    };
    return await doRequest(baseURL + urlPath, requestData);
}

async function getEventDataForGroups(groups) {
    let allEvents = [];
    await Promise.all(groups.map(async (groupInfo) => {
        let urlPath = `Group/${groupInfo["id"]}`;
        const events = await sendDigiroosterRequest(urlPath, groupInfo["year"]);
        allEvents.push(...events);
    }));
    return allEvents;
}

async function getEventDataForLecturers(lecturerIds) {
    let allEvents = [];
    await Promise.all(lecturerIds.map(async (lecturerId) => {
        let urlPath = `Lecturer/${lecturerId}`;
        const events = await sendDigiroosterRequest(urlPath, 1);
        allEvents.push(...events);
    }));
    return allEvents;
}

function createFullCalendarEventObject(item) {
    return {
        title: item["Name"].replace("&amp;", "& "),
        start: item["Start"],
        end: item["End"],
        extendedProps: {
            groups: item["Subgroups"].map(({Name}) => Name),
            rooms: item["Rooms"].map(({Id}) => Id),
            lecturers: item["Lecturers"].map(
                lecturer => (`${lecturer["Description"].replace(/(, )$/, "")} (${lecturer["Code"]})`)
            ),
        },
    }
}

function saveEvent(eventData, lecturerEvent) {
    // If the event was already saved, skip this iteration, otherwise save it
    if ( savedEventIds.includes(eventData["Id"]) ) { return }

    // Create FullCalendar compatible object and set custom properties
    let fullCalendarEvent = createFullCalendarEventObject(eventData);
    if ( lecturerEvent ) {
        fullCalendarEvent["backgroundColor"] = "#464646"; fullCalendarEvent["borderColor"] = "#464646"
    }
    let examSubstrings = ["Exam kw", "tent kw", "hert kw", " Resit ", " resit ", "-TOETS-"];
    if ( examSubstrings.some(substring => eventData["Name"].includes(substring)) ) {
        fullCalendarEvent["backgroundColor"] = "#800000"; fullCalendarEvent["borderColor"] = "#800000"
    }

    // Save the event
    savedEventIds.push(eventData["Id"])
    allBinGroupEvents.push(fullCalendarEvent);
    if ( binRoomIds.some(roomId => fullCalendarEvent.extendedProps.rooms.includes(roomId)) ) {
        onlyBinRoomEvents.push(fullCalendarEvent);
    }
}

function createResponseObject(eventItems) {
    let timeNow = new Date();
    timeNow.setHours(timeNow.getHours() + 1);
    return {
        gatherDate: toUTCString(timeNow),
        dateRange: getDateRange(),
        items: eventItems
    };
}

function download(content, fileName, contentType) {
    let a = document.createElement("a");
    let file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

// =====================================================================================================
// ============================================ MAIN ===================================================
// =====================================================================================================
const binGroups = [
    {year: 1, id: 10763},  // BFV1:   Bioinformatics Year 1
    {year: 2, id: 10762},  // BFV2:   Bioinformatics Year 2
    {year: 3, id: 10768},  // BFV3:   Bioinformatics Year 3
    {year: 3, id: 10197},  // BFVB3:  Minor Bio-Informatica
    {year: 3, id: 10143},  // BFVF3:  Minor Voeding en Gezondheid
    {year: 1, id: 10627},  // DSLSR1: Master Data Science for Life Sciences Year 1
    {year: 1, id: 14198},  // DSLSR2: Master Data Science for Life Sciences Year 2
];
const binLecturerIds = [564,  457,  21257, 947,  519,  63,   296,  19886, 242,  1043, 25,   818,  19806, 1066, 1000, 2104, 1106, 310,  62]
//                      APMA, BABA, BLJA,  BOJP, FEFE, HEMI, KEMC, KRPE,  LADR, LUMF, NASA, NOMI, OLLO,  PARN, POWE, VEID, WATS, WERD, WIBA
const binRoomIds = [11367, 11368, 11388, 11398, 11399];
//                  D1.07, D1.08, H1.122,H1.86, H1.88A

let allBinGroupEvents = [];
let onlyBinRoomEvents = [];
let savedEventIds = [];

$.each(await getEventDataForGroups(binGroups), function (_, eventData) { saveEvent(eventData, false) });
$.each(await getEventDataForLecturers(binLecturerIds), function (_, eventData) { saveEvent(eventData, true) });

// download(JSON.stringify(createResponseObject(allBinGroupEvents)), "all-bin-group-calendar-events.json", "text/plain");
download(JSON.stringify(createResponseObject(onlyBinRoomEvents)), "only-bin-room-calendar-events.json", "text/plain");
