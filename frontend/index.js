let navOpen = false;
let navWidth = 350;
let widthStr = navWidth + "px";
let dragging = false;
let clickDeselect = false;
let initClick = [0, 0];
let initPos = [0, 0];
let windowWidth, windowHeight, prevWidth;
let switchWidth = false;


/* Set the width of the side navigation to the desired width */
function openNav() {
    $("#mySidenav").css("width", widthStr);
    $("#navBtn").css("left", widthStr);
    $("#navBtn").html("&#8249;");
    navOpen = true;
}

/* Set the width of the side navigation to 0 */
function closeNav() {
    $("#mySidenav").css("width", "0");
    $("#navBtn").css("left", "0");
    $("#navBtn").html("&#8250;");
    navOpen = false;
}

/* Toggle whether the sidenav menu is open */
function navClick() {
    if (navOpen == true) {
        closeNav();
    }
    else {
        openNav();
    }
}

/* Get the size of the window and adjust UI as needed */
function getPageSize(){
    windowHeight = $(window).height(); // New height
    windowWidth = $(window).width(); // New width

    if((prevWidth > 1000 || typeof prevWidth === 'undefined') && windowWidth <= 1000){
        navWidth = 250;
        switchWidth = true;
    }
    else if((prevWidth <= 1000 || typeof prevWidth === 'undefined') && windowWidth > 1000){
        navWidth = 350;
        switchWidth = true;
    }
    
    widthStr = navWidth + "px";

    if(navOpen && switchWidth){
        $("#mySidenav").css("width", widthStr);
        $("#navBtn").css("left", widthStr);
    }

    prevWidth = windowWidth
    switchWidth = false;
}

function updateCoords(latLng)
{
    if (latLng != null) {
        $("#latStart").val(latLng.lat);
        $("#lonStart").val(latLng.lng);
    }
    $("#latStart").val(parseFloat($("#latStart").val()).toFixed(5));
    $("#lonStart").val(parseFloat($("#lonStart").val()).toFixed(5));
}

// called on window load to set button event handlers
function loadNavControls() {
    $("#openDocs").click(() => {
        window.open("docs.html");
    });

    $("#openConfig").click(() => {
        window.open("config.html");
    });

    $("#exitBtn").click(() => {
        exitVPGT();
        
    });
}

function loadSidenav()
{   
    $(window).resize(() => {
        getPageSize();
      });

    $("#navBtn").click(() => {
        navClick();
    });

    loadNavControls();

    $("#latStart, #lonStart").change(() => {
        updateCoords();
    });

    $("#generate button").click(() => {
        runAI();
    });

    $("#tableOpenBtn").click(() => {
        $("#pathMgr").css("display", "inline")
    });

    $($("#toggleDarkMode img")[0]).css("display", "none");

    $("#toggleDarkMode").click(toggleDarkMode);
}

function onEscape() {
    if (Path.SelectedNode != null)
    {
        Path.SelectNode(null);
        updatePath(Path.CurrentSelection[0], false);
        updateTable();
        updateSelectionDisplay();
    }
    else
    {
        clearSelection();
    }
}

window.onload = function () {
    loadSidenav();
    loadManager();
    loadContextMenu();
    getPageSize();

    $(document).keydown(e => {
        if (e.key === "Escape")
            onEscape();
    });

}


//Function to exit VPGT
//Sends ajax request to server, closes browser on response
//Server closes after connections finish
function exitVPGT() {
    $("#exitBtn").html(`<label>Exiting...</label>`);
    $.ajax({
        type: 'POST',
        url: "/endServer",
    }).done(function (response) {
        console.log(response);
        console.log("Browser: Exiting VPGT...");
        window.close();
    });
}



function runAI() {

    $("#generate").html(`<label>&emsp;Generating...</label> <br> <progress id="generate"></progress>`);

    $.ajax({
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        url: "/genPath",
        data: JSON.stringify({
            latStart: $('#latStart').val() || null,
            lonStart: $('#lonStart').val() || null,
            mmsi: $('#MMSI').val() || null,
            sog: $('#SOG').val() || null,
            cog: $('#COG').val() || null,
            heading: $('#Heading').val() || null,
            pathLength: $('#Length').val() || null,
            eventpercent: $('#eventPercent').val() || null
        }),
        context: document.body,
        success: function (jsondata) {
            console.log(jsondata);


            let path = new Path("Generated", jsondata);
            showToast("Path generation complete!");
            plotPath(path);



            $("#generate").html(`<button onclick="runAI()">Generate</button>`);
        },
        error: function (error) {
            window.alert("There was a server-side path generation error!\nError:\n" + error.responseText);
            $("#generate").html(`<button onclick="runAI()">Generate</button>`);
        }
    })
}

//Plots a path to the map from the given file
function plotFromFile(file) {
    if (file.type != "application/json") {
        window.alert("Non JSON files are not supported");
        return;
    }

    let fr = new FileReader();
    fr.onload = function () {

        let parsed;
        try
        {
            parsed = JSON.parse(fr.result);
        }
        catch (error)
        {
            window.alert("Error plotting path from file. \nError: " + error);
            return;
        }

        if (parsed.Paths != undefined) {
            if (parsed.Paths.length == 0)
            {
                showToast("Your path file didn't contain any paths!");
            }
            parsed.Paths.forEach(path => {
                let PathInstance = new Path(path.Name, path);

                PathInstance.DisplayData = path.DisplayData;
                PathInstance.PathEvents = path.PathEvents;

                plotPath(PathInstance);


            });
        }
        else {
            let path = new Path(file.name.replace(".json", ""), JSON.parse(fr.result));
            plotPath(path);
        }
    };
    fr.readAsText(file);
}

function uploadPath() {
    var files = document.getElementById('pathFiles').files;
    if (files.length <= 0) {
        return false;
    }
    plotFromFile(files[0]);
};

function updateSelectedPaths() {
    let pColor = $("#pathColor").val();
    let nColor = $("#nodeColor").val();
    Path.CurrentSelection.forEach(path => {
        path.ChangeColor(pColor, nColor);
        updatePath(path);
    });
}

function download(dlType = '') {
    if (dlType==='formatted') {
        Path.DownloadFormatted();
    }
    else if(dlType==='formattedall'){
        Path.DownloadFormatted(true);
    }
    else if(dlType==='raw'){
        Path.CurrentSelection.forEach(path => {
            path.Download();
            console.log(path);
        });
    }
}

//Handles drag and drop of files
function dropHandler(ev) {
    ev.preventDefault(); //To prevent browsers from trying to open the file on drop

    //Hide the overlay
    document.getElementById("dragoverlay").style.visibility = "hidden";

    //Grab the file(s) that are dropped
    let files = ev.target.files || ev.dataTransfer.files;

    //Loop through captured files
    for (let i = 0; i < files.length; i++) {
        plotFromFile(files[i]);
    }
}

//Handles when the user drags over the map
function dragOverHandler(ev) {
    ev.preventDefault(); //To prevent browsers from trying to open the file when it gets dragged into the dropzone
    ev.dataTransfer.dropEffect = "copy";
    //Show the overlay
    document.getElementById("dragoverlay").style.visibility = "visible";
}

function dragLeaveHandler(ev) {
    //Hide the overlay
    document.getElementById("dragoverlay").style.visibility = "hidden";
}

function populateEventDropDown(eventsPool) {
    let eventDropDown = $('#eventType');
    eventDropDown.empty();

    const url = './config.json';

    // table of event categories
    let categories = {};

    // go through each event in the pool
    $.each(eventsPool, (eventName, eventData) => {
        console.log(eventData.Type);
        console.log(eventData);
        // grab all the categories
        if (categories[eventData.Category] == undefined)
            categories[eventData.Category] = [];
        categories[eventData.Category].push(eventData.Type);
    });

    $.each(categories, (categoryName, events) => {
        let $optgroup = $('<optgroup>').attr('label', categoryName);
        $.each(events, (i, eventName) => {
            $optgroup.append(`<option value="${eventName}">${eventName}</option>`);
        });
        eventDropDown.append($optgroup);
    });
}




