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
    {year: 1, id: 10763},  // BFV1: Bioinformatics Year 1
    {year: 2, id: 10762},  // BFV2: Bioinformatics Year 2
    {year: 3, id: 10768},  // BFV3: Bioinformatics Year 3
    {year: 3, id: 10197},  // BFVB3: Minor Bio-Informatica
    {year: 3, id: 10143},  // BFVF3: Minor Voeding en Gezondheid
    {year: 1, id: 10627},  // DSLSR1: Master Data Science for Life Sciences Year 1
    {year: 1, id: 14198},  // DSLSR2: Master Data Science for Life Sciences Year 2
];
const binRoomIds = [11367, 11368, 11388, 11398, 11399];
//                  D1.07, D1.08, H1.122,H1.86, H1.88A

let allBinGroupEvents = [];
let onlyBinRoomEvents = [];
let amountOfWeeks = 8;

$.each(await getEventDataForGroups(binGroups), function (index, eventData) {
    let fullCalendarEvent = createFullCalendarEventObject(eventData);
    allBinGroupEvents.push(fullCalendarEvent);

    if ( binRoomIds.some(roomId => fullCalendarEvent.extendedProps.rooms.includes(roomId)) ) {
        onlyBinRoomEvents.push(fullCalendarEvent);
    }
});

// download(JSON.stringify(createResponseObject(allBinGroupEvents)), "all-bin-group-calendar-events.json", "text/plain");
download(JSON.stringify(createResponseObject(onlyBinRoomEvents)), "only-bin-room-calendar-events.json", "text/plain");
