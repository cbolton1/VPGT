/*
Responsible for managing the display and configuration of the map
*/

// Layers related to displaying plots/points on map
let pathLayer;
let markerLayer;
let labels = [];

function addLabels(feature, layer)
{
    if(layer.feature.geometry.type == 'MultiPolygon'){
        maxPoints = layer.feature.geometry.coordinates[0]
        layer.feature.geometry.coordinates.forEach(coords=>{
            if(coords[0].length > maxPoints[0].length){
                maxPoints = coords;
            }
            console.log(coords);
        });
        centerPoint = polylabel(maxPoints, 0.001);
    }else{
        centerPoint = polylabel(feature.geometry.coordinates, 0.001);
    }
    //These have to be switched because lat/lon are returned in different order than expected
    let label = L.marker([centerPoint[1],centerPoint[0]],{
        icon: L.divIcon({
            html: feature.properties.name,
            direction:'center',
            iconSize: [0,0],
            iconAnchor: [feature.properties.name_len*2,0],
            className: 'countryLabel',
            labelrank: feature.properties.labelrank
        })
    })
    label.addTo(labels[feature.properties.labelrank-1]);
}

// creates the map
async function createMap()
{
    let promise = new Promise((resolve, reject) => {
        let mapConfig = {};
        $.getJSON('./config.json', data => {
            mapConfig = data.MapConfig;

            let mapPath = mapConfig.MapPath;
            let defaultLocation = mapConfig.DefaultLocation;
            let defaultZoom = mapConfig.ZoomOptions.DefaultZoom;
            let mxZoom = mapConfig.ZoomOptions.MaxZoom;
            let mnZoom = mapConfig.ZoomOptions.MinZoom;
            let mapStyle = mapConfig.MapStyle;
            // let mapStyle = mapConfig.DarkMode ? mapConfig.MapStyleLight : mapConfig.MapStyleDark

            let root = document.querySelector(":root");
            let newColor = `${mapStyle.backgroundColor}`;
            root.style.setProperty("--backgroundColor", newColor);

            map = L.map('map',{ zoomControl: false, minZoom: mnZoom, maxZoom: mxZoom }).setView(defaultLocation, defaultZoom);
            
            new L.Control.Zoom({ position: 'topright' }).addTo(map);
            //Map Sources: https://github.com/simonepri/geo-maps
            $.getJSON(mapPath, function(json) {
                console.log(json); // this will show the info it in firebug console
                L.geoJSON(json, {
                    style: mapStyle,
                    onEachFeature: addLabels,
                }).addTo(map);
                $(".countryLabel").css("color", mapStyle.labelColor);
         
                //updateSelectionDisplay();
            });
            pathLayer = L.layerGroup().addTo(map);
            markerLayer = L.layerGroup().addTo(map);
            for(let i = 0;i<8;i++){
                labels.push(L.layerGroup().addTo(map));
            }

            console.log(labels);
            map.on('click', mapClick);
            map.on('zoomend', zoomEnd);

            $(".map").css("background-color", mapStyle.backgroundColor);

            resolve(map);
        });
    });
    
    return promise;

    //L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 16}).addTo(map);
}

(async () => {
    map = createMap();
})();

var markerToggle = false;


let startMarkerSize = 30;
let startSVG = `<svg width="${startMarkerSize}" height="${startMarkerSize}">
        <path d="M0 0 L${startMarkerSize} 0 L${startMarkerSize} ${startMarkerSize} L0 ${startMarkerSize} Z" fill="#ffff00" stroke="black"></path>
        <polyline points="
        ${startMarkerSize/2}, 0, 
        ${startMarkerSize/2}, ${startMarkerSize}, 
        ${startMarkerSize/2}, 0, 
        0, ${startMarkerSize/2}, 
        ${startMarkerSize/2}, 0, 
        ${startMarkerSize}, ${startMarkerSize/2}
        " fill="none" stroke="red" stroke-width="5"/>
        </svg>`;

        // svg = '<svg ' + 
        // 'xmlns="http://www.w3.org/2000/svg">' +
        // '<path d="M40 70 L50 30 L60 70 Z" fill="' +  color + '" stroke="black"' +
        // 'transform=" scale(1,1) ' +
        // 'rotate(' + heading + ' 50  50)"></path>' +
        // '</svg>'; 

let startMarker;

function moveMarker()
{
    let lat = $("#latStart").val();
    let lng = $("#lonStart").val();

    let latlng = [lat, lng];

    let ico = L.divIcon({
        html: startSVG,
        className: "startMarker",
        iconAnchor: [startMarkerSize/2, startMarkerSize/2]
    });

    if (startMarker == undefined)
    {
        startMarker = L.marker(latlng, {icon: ico}).addTo(markerLayer)
    }
    else
    {
        startMarker.setLatLng(latlng);
    }    
}

// Event handler for clicking on the map
function mapClick(e) {
    // deslect everything

    clearSelection();
    updateCoords(e.latlng);

    moveMarker();
    
}

//Function for plotting path
function plotPath(PathInstance, autoFit=true) {

    console.log("Plotting Path");

    try
    {

        //let plot = null;
        let points = [];

        let rawPathData = PathInstance.PathData;

        PathInstance.PlotLayers.NodeLayer = L.layerGroup();

        for (let i = 0; i < rawPathData.length; i++)
        {
            if (PathInstance.PathEvents.find(e => e.PathNode === i) == undefined)
            {
                //create marker svg icons
                svgIcon = createSVG(rawPathData[i][5], PathInstance.DisplayData.NodeColor, false);
            }
            else
            {
                svgIcon = createSVG(rawPathData[i][5], PathInstance.DisplayData.NodeColor, true);
            }

            //add point to be included in path polyline     
            points.push([ rawPathData[i][1], rawPathData[i][2] ]);

            //create the marker
            let marker = L.marker([ rawPathData[i][1], rawPathData[i][2]], {icon: svgIcon}).addTo(PathInstance.PlotLayers.NodeLayer);

            let popupHTML = 
            `<b>Path Name: ${PathInstance.Name}<br>
            Time: ${new Date(rawPathData[i][0]*1000).toUTCString()}<br>
            Latitude: ${rawPathData[i][1]}<br>
            Longitude: ${rawPathData[i][2]}<br>
            SOG: ${rawPathData[i][3]}<br>
            COG: ${rawPathData[i][4]}<br>
            Heading: ${rawPathData[i][5]}</b>`;

            marker.bindPopup(popupHTML);

            marker.on('click', function(event) {
                deselectOthers(PathInstance);
                Path.SelectNode(i);
                updateSelectionDisplay();
            });
        }
        updateTable();

        let pathOpacity = PathInstance.Selected ? 1.0 : 0.3;
        if (PathInstance.Selected)
        {
            markerLayer.addLayer(PathInstance.PlotLayers.NodeLayer)
        }
        PathInstance.LatLngs = points;
        PathInstance.PlotLayers.PathLayer = L.polyline(points, { color: PathInstance.DisplayData.PathColor, weight: 20, opacity: pathOpacity }).addTo(pathLayer);
        PathInstance.PlotLayers.PathLayer.bindPopup(`<b>Path ${PathInstance.Name}<br>MMSI: ${PathInstance.MMSI}</b>`);
        PathInstance.PlotLayers.PathLayer.on('click', function (e) {
            
            // should we add to the current selection or just replace it?
            if (e.originalEvent.shiftKey)
            {
                PathInstance.Select();
            }
            else
            {
                
                deselectOthers(PathInstance);

                // Toggle what we clicked on
                PathInstance.ToggleSelect();
            }

            updatePath(PathInstance);
            updateSelectionDisplay();
        });

        if (autoFit)
        {
            // fit the bounds to multiple maps if multiple are selected
            if (Path.CurrentSelection.length > 1)
            {
                let pathBounds = [];
                for (let p of Path.CurrentSelection)
                {
                    pathBounds.push(p.LatLngs);
                }
                let bounds = L.latLngBounds(pathBounds);
                map.fitBounds(bounds);
            }
            else
                map.fitBounds(PathInstance.PlotLayers.PathLayer.getBounds());
        }
            
        
    }
    catch (error)
    {
        window.alert("Error plotting path. Ensure AIS data fields are properly formatted!\nError: " + error);
        PathInstance.Delete();
        showToast("Failed to plot path!");
    }

}

// deselects all other paths than the one specified
function deselectOthers(PathInstance)
{
    // Deselect all the other paths
    Path.CurrentSelection.forEach(element => {
        if (element !== PathInstance)
        {
            element.Deselect();
            updatePath(element);
        }
    });
}

// deselect everything
function clearSelection()
{
    Path.CurrentSelection.forEach(element => {
        element.Selected = false;
        updatePath(element);
    });

    Path.CurrentSelection = [];
    Path.SelectNode(null);

    updateSelectionDisplay();
    updateTable();
}

// removes a path's layers from the map
function clearPathPlot(PathInstance) {
    if (PathInstance.PlotLayers.PathLayer != null)
        pathLayer.removeLayer(PathInstance.PlotLayers.PathLayer);
    if (PathInstance.PlotLayers.NodeLayer != null)
        markerLayer.removeLayer(PathInstance.PlotLayers.NodeLayer);
}


// re-renders a path based on its current state
function updatePath(PathInstance, autoFit=false)
{
    clearPathPlot(PathInstance);
    plotPath(PathInstance, autoFit);
}

//function for creating the icon svg for the marker
function createSVG(heading, color, invert){
    //if heading is not recorded (default value) marker is a dot
    noHeadingSvg = '<svg width="100" height="100">' +
    `<circle cx="50" cy="50" r="50" fill="${color}" stroke="black"/>` +
    '</svg>';

    let svgSize = 50;

    let borderColor = invert ? "white" : "black";
    let filterStr = invert ? `style="filter: invert(1)"` : "";
    

    normalSvg = 
    `<svg width="${svgSize}" height="${svgSize}" xmlns="http://www.w3.org/2000/svg">
        <path 
        d="M${0.3 * svgSize} ${0.9 * svgSize} L${0.5 * svgSize} ${0.1 * svgSize} L${0.7 * svgSize} ${0.9 * svgSize} L${0.5 * svgSize} ${0.8 * svgSize} Z" 
        fill="${color}" stroke="${borderColor}" 
        transform="rotate(${heading} ${svgSize/2} ${svgSize/2})" ${filterStr}></path>
    </svg>`;

    let svg = normalSvg;
    //if point has heading, marker is a triangle pointing in direction of heading, otherwise use a circle
    if (heading == 511.0){
        svg = noHeadingSvg;
    }
    

    svgIcon = L.divIcon({
        html: svg,
        className: "markers",
        iconAnchor: [svgSize/2, svgSize/2]
    });

    return svgIcon;
}

//removing markers after a certain zoom level
function zoomEnd(e) {    
    // Potentially useful future resizing points with zoom
    console.log(map.getZoom());
    zoomLevel = map.getZoom();
    for(i = 0; i<labels.length-1;i++){
        //Adjusting the value added to i in the comparison to the zoom adjusts the zoom threshold for countries to appear
        if(zoomLevel<i+2){
            map.removeLayer(labels[i]);
        }else{
            map.addLayer(labels[i]);
        }
    }
    
}


// updates the heading of the start marker SVG icon
function updateHeading()
{
    let heading = $("#Heading").val() || 0;
    startSVG = 
        `<svg width="${startMarkerSize}" height="${startMarkerSize}">
            <path d="M0 0 L${startMarkerSize} 0 L${startMarkerSize} ${startMarkerSize} L0 ${startMarkerSize} Z" fill="#ffff00" stroke="black"></path>
            <polyline points="
                ${startMarkerSize/2}, 0, 
                ${startMarkerSize/2}, ${startMarkerSize}, 
                ${startMarkerSize/2}, 0, 
                0, ${startMarkerSize/2}, 
                ${startMarkerSize/2}, 0, 
                ${startMarkerSize}, ${startMarkerSize/2}
            " fill="none" stroke="red" stroke-width="5" transform="rotate(${heading} ${startMarkerSize/2}  ${startMarkerSize/2})"/>
        </svg>`;

    let ico = L.divIcon({
        html: startSVG,
        className: "startMarker",
        iconAnchor: [startMarkerSize/2, startMarkerSize/2]
    });

    startMarker.setIcon(ico);
}
