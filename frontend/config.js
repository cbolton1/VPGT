window.onload = function()
{
    getData();
    $($("#toggleDarkMode img")[0]).css("display", "none");

    $("#toggleDarkMode").click(toggleDarkMode);
}

let configJSON;
let fieldIndex = 0;
let settingMap = [];

let splitView = true;

function toggleView() {
    splitView = !splitView;
    if (splitView) {
        let optCSS = {
            "grid-template-columns": "1fr 1fr",
            "grid-template-rows" : "1fr 20fr 1fr 1fr"
        };
        $('.options').css(optCSS);
        $('#jsonHeader').css("display", "block");
        $('#jsonText').css("display", "block");
        $('#toggle').css("background-color", "rgb(43, 104, 41)");
    } else {
        let optCSS = {
            "grid-template-columns": "1fr",
            "grid-template-rows" : "1fr 20fr 1fr 1fr 1fr 1fr"
        };
        $('.options').css(optCSS);
        $('#jsonHeader').css("display", "none");
        $('#jsonText').css("display", "none");
        $('#toggle').css("background-color", "rgb(161, 35, 35)");
    }

}

function getData(){
    $.getJSON('./config.json', data => {
        //Takes top level keys from data, creates subheaders, then runs populateConfigOptions on their contents

        configJSON = data;
        // Load the textbox with JSON string
        updateTable();
        loadTextbox(data);
    });
}

function updateTable() {
    let data = configJSON;
    let configdisplay = $('#configDisplay');
    let fieldIndex = 0;
    for(let key in data){
        configdisplay.append(`<tr><th id="subheader" colspan="3"><h3>${key}</h3></th></tr>`);
        populateConfigOptions(data[key], configdisplay, fieldIndex);
    }
}

function loadTextbox(data){
    let configText = JSON.stringify(data, null, '\t');
    let configDisplay =$('#jsonText');
    configDisplay.val(configText);
}

// Live updates the JSON model of our data
function updateText(idString, colorString) {
    updateConfigJSON();
    loadTextbox(configJSON);

    if (colorString.length > 0)
    {
        $("#" + colorString).val($("#"+idString).val());
    }

}

//Takes json object, and configdisplay(for updating html)
function populateConfigOptions(data, configdisplay){
    for(let key in data){
        //if the keys contents are an object, append it to configdisplay as a settinggroup
        //then recursivly call the function with the keys contents and the html
        //if the keys contents are not an object, add the key and its value to the html as a label and textbox
        if(typeof data[key] === 'object' && data[key] !== null){
            configdisplay.append($(`<tr><td id="settinggroup" colspan="3"><h4>${key}</h4></td></tr>`));
            populateConfigOptions(data[key], configdisplay);
        }else{
            let idString = "field" + fieldIndex;
            //Check for special input field
            //Default empty field
            let specInField = ``;
            //Check for color values
            let re = /[0-9A-Fa-f]{6}/g;
            let isHex = re.test(data[key]);

            let colorSelectID = "";

            // if hex field, slot in additional color input field
            if(isHex){
                colorSelectID = "color" + fieldIndex;
                specInField = `<input type="color" id="${colorSelectID}" value="${data[key]}" onchange="updateColor(&quot;${idString}&quot;, &quot;${colorSelectID}&quot;)"></input>`;
            }
            
            configdisplay.append(`<tr><td><label>${key}</label></td><td><input type="text" id="${idString}" value="${data[key]}" oninput="updateText(&quot;${idString}&quot;, &quot;${colorSelectID}&quot;)">${specInField}</td></tr>`);
            console.log(`The idString = ${idString}`);
            
            settingMap.push({ idString, data, key});
            fieldIndex++;
        }
    }
}

function updateColor(textFieldID, colorSelectID){
    let selectedColor = $("#"+colorSelectID).val();
    $("#"+textFieldID).val(selectedColor);
    updateConfigJSON();
    loadTextbox(configJSON);
}

function saveConfigOld(){
    // loop across each row
    $('#configDisplay tr').each(function(index) {
        // skip the first (it's the title)
        if(index != 0){

            let row = $(this.children);
            if(row.is('#subheader')) {
                console.log(row.text() + ' : {');
            }else if(row.is('#settinggroup')) {
                console.log('settinggroup');
                console.log(row.text());
            }
            else{
                if(row[1].tagName == 'TD' && row[1].children.length > 0) {
                    let cellcontents = row[1].children;
                    if(cellcontents[0].tagName == 'INPUT') {
                        console.log(cellcontents[0].id + ' : ' + cellcontents[0].value);
                    }
                }  
            }
        }
    });
}

function updateConfigJSON() {
    settingMap.forEach(element => {
        let inputField = $("#" + element.idString);
        element.data[element.key] = inputField.val();
    });
}

function saveConfig() {
    updateConfigJSON();

    // let fs = new FileSystem();
    // // save config
    // let newconfig = JSON.stringify(configJSON, null, 4);

    // fs.writeFile('./config.json', newconfig, (err) =>{
    //     if(err){
    //         throw err;
    //     }
    //     //notify user the config is saved
    // })

    $.ajax({
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        url: "/saveConfig",
        data: JSON.stringify(configJSON),
        context: document.body,
        success: function (jsondata) {
            console.log(jsondata);
            showToast("Config successfully saved");
        },
        error: function (error) {
            window.alert("There was a config error!\nError:\n" + error.responseText);
        }
    })
}

function showAddEvent(){
    let newdata = {
        "Type" : "",
        "Category" : "",
        "Description" : ""
    }
    configJSON.EventConfig.EventsPool.push(newdata);
    $('#configDisplay').empty();

    updateTable();
    loadTextbox(configJSON);
}

function reset(){
    $('#configDisplay').empty();
    getData();
}

function applyDefaultConfig(){
    //Should ask the user if they are sure they want to restore defaults
    configJSON = 
    {
        "MapConfig": {
            "MapPath": "./maps/small.geo.json",
            "DefaultLocation": {
                "lat": "41.5801",
                "lon": "-71.4774"
            },
            "ZoomOptions": {
                "DefaultZoom": "8",
                "MaxZoom": "20",
                "MinZoom": "4"
            },
            "MapStyle": {
                "color": "#2d7b45",
                "fillColor": "#76cb94",
                "fillOpacity": "1.0",
                "backgroundColor": "#24e5ff",
                "labelColor": "#ffffff",
                "weight": "1",
                "opacity": "1.0"
            }
        },
        "EventConfig": {
            "EventsPool": [
                {
                    "Type": "AIS Sensor Failure",
                    "Category": "Equipment",
                    "Description": "None"
                },
                {
                    "Type": "AIS Sensor Error",
                    "Category": "Equipment",
                    "Description": "None"
                },
                {
                    "Type": "Tropical Storm",
                    "Category": "Weather",
                    "Description": "None"
                },
                {
                    "Type": "High Wind Speeds",
                    "Category": "Weather",
                    "Description": "None"
                },
                {
                    "Type": "Clear Weather",
                    "Category": "Weather",
                    "Description": "None"
                },
                {
                    "Type": "Walked the Plank",
                    "Category": "Personnel",
                    "Description": "None"
                }
            ]
        }
    };
    $('#configDisplay').empty();
    updateTable();
    loadTextbox(configJSON);
}