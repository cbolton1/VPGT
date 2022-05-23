const Menu = {
    Generate: "Generate",
    Path: "Path",
    Node: "Node",
};

let currentMenu = Menu.Generate;
let prevMenu = currentMenu;

// called on window load to set button event handlers
function loadContextMenu() {
    $("#selectNone").show();
    $("#addEvent").click(() => {
        let eventType = $("#eventType").val();
        let category = $("#eventType :selected").parent().attr('label')
        //let category = eventPool[eventType].Category; ---Broken by changes
        let description = $("#eventDescription").val();
        $("#eventDescription").val(''); //Clear the value of the description box after adding the event
        let newEvent = new PathEvent(eventType, category, description, Path.SelectedNode);

        let fields = $("#eventUserData input");
        for (let i = 0; i < fields.length; i += 2)
        {
            if (fields[i].value.length !== 0)
                newEvent.UserData[fields[i].value] = fields[i+1].value;
        }

        console.log(newEvent);

        Path.CurrentSelection[0].AddEvent(newEvent);
        updatePath(Path.CurrentSelection[0]);
        updateTable();
        updateSelectionDisplay();
        showToast("Event added!");
    });

    $("#addField").click(() => {
        let fieldHtml = `<input type="text" placeholder="key"><input type="text" placeholder="value"><br>`;
        $("#eventUserData").append(fieldHtml);
    });

    let eventPool = {};

    $.getJSON('./config.json', data => {
        eventPool = data.EventConfig.EventsPool;
        //configureMap(data.MapConfig);
        populateEventDropDown(eventPool);
    });

}

// Determines the state the context sensitive menu should be in and assigns it
function checkCurrentMenu() {
    prevMenu = currentMenu;
    if (Path.CurrentSelection.length > 0) {
        if (Path.SelectedNode != null) {
            currentMenu = Menu.Node;
        }
        else {
            currentMenu = Menu.Path;
        }
    }
    else {
        currentMenu = Menu.Generate;
    };
}

// Refreshes the path contextual menu
function updatePathMenu() {
    let selection = Path.CurrentSelection;
    $("#pathName").html("Multiple Paths Selected");
    $("#pathHeader>button").css("display", "none");
    $("#pathSelectionNum").html("Selected paths: " + selection.length);
    $("#selectedPathsList").empty();



    $("#pathColor").val(selection[selection.length-1].DisplayData.PathColor);
    $("#nodeColor").val(selection[selection.length-1].DisplayData.NodeColor);

    selection.forEach(element => {
        $("#selectedPathsList").append($(`<li>${element.Name}</li>`));
    });

    if (selection.length === 1) {
        $("#pathHeader>button").css("display", "inline");
        $("#pathName").html(selection[0].Name);
        $("#pathEvents").empty();
        selection[0].PathEvents.forEach(event => {
        let eventHTML = `
            Event Type: ${event.Type} <br>
            Event Description: ${event.Description} <br>
            Associated Node: ${event.PathNode}<br>
        `;

            $("#pathEvents").append($(`<li>${eventHTML}</li>`));
        });
    }
}

// replaces the input field with the new path name
function replaceHeader() {
    Path.CurrentSelection[0].Name = $("#pathName").val();
    $("#pathName").replaceWith(`<h2 id="pathName"></h2>`);
    updatePathMenu();
    updateTable();
}

// replaces the path name with an input field
function renamePath() {
    $("#pathName").replaceWith(`<input type="text" id="pathName" onchange="replaceHeader()">`);
    $("#pathName")[0].focus();
}

function removeEvent(index) {
    let events = Path.CurrentSelection[0].PathEvents;
    events.splice(index, 1);
    console.log(events);
    updatePath(Path.CurrentSelection[0]);
    updateSelectionDisplay();
}

// updates the node contextual menu
function updateNodeMenu() {
    let nodeIndex = Path.SelectedNode;
    $("#nodeNum").html(nodeIndex);
    $("#eventUserData").empty();

    $("#nodeEvents").empty();
    let events = Path.CurrentSelection[0].PathEvents.filter(e => e.PathNode === nodeIndex);
    events.forEach(e => {
        let userData = "";
        for (let field in e.UserData)
        {
            userData += `${field}: ${e.UserData[field]}<br>`;
        }
        let userHtml="";
        if (userData.length > 0)
        {
            userHtml = "User Data<br>" + userData;
        }
        let cssStr = (userData.length > 0) ? "block" : "none";
        $("#userDataLabel").css("display", cssStr);
        let eventIndex = Path.CurrentSelection[0].PathEvents.findIndex(ev => ev === e);
        let eventHTML = `<li>
        Event Type: ${e.Type} <br>
        Event Description: ${e.Description} <br>
        ${userHtml}
        Associated Node: ${e.PathNode}<br>
        <button onclick="removeEvent(${eventIndex})">Remove</button><br>
        </li>`;
        $("#nodeEvents").append(eventHTML);
    });
}

// Updates the context sensitive menu
function updateSelectionDisplay() {
    openNav();

    checkCurrentMenu();

    let menuSelector;

    switch (currentMenu) {
        case Menu.Generate:
            menuSelector = "#selectNone";
            break;
        case Menu.Path:
            menuSelector = "#selectPath";
            updatePathMenu();
            break;
        case Menu.Node:
            menuSelector = "#selectNode";
            updateNodeMenu();
            break;
    }

    // Don't fade if we didn't change menus
    if (prevMenu !== currentMenu)
    {
        clearSelectionDisplay();
        $(menuSelector).fadeIn("slow");
    }

}

function clearSelectionDisplay() {
    $("#selectNone").css("display", "none").finish();
    $("#selectPath").css("display", "none").finish();
    $("#selectNode").css("display", "none").finish();
}