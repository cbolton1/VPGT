/*
Responsible for management of the Path data structures on the frontend
*/

class Path
{
    static CurrentSelection = [];
    static SelectedNode = null;
    static AllPaths = [];

    constructor(name, pathJSON)
    {
        this.PathData = pathJSON.PathData;
        this.MMSI = pathJSON.MMSI;
        this.Name = name;
        this.PathEvents = pathJSON.PathEvents;
        try
        {
            this.calcPathStats();
            Path.AllPaths.push(this);
        }
        catch (error) {
            window.alert("Error loading path. Make sure JSON isn't ill formed!\nError:\n" + error);
            showToast("Error calculating path stats!");
        }
        console.log(this);

    }

    //Path Statistics
    MMSI = 123456789;
    Name = "Default Name";
    PathData = {};
    LatLngs = [];
    Length = 0;
    AverageSpeed = 0;
    StartLat = 0;
    StartLon = 0;

    // Path Rendering

    DisplayData = 
    {
        PathColor: '#117711',
        NodeColor: '#008B8B',
        MarkersVisible: true
    };

    PlotLayers = 
    {
        PathLayer: null,
        NodeLayer: null
    };

    ChangeColor(pathColor, nodeColor = this.DisplayData.NodeColor)
    {
        this.DisplayData.PathColor = pathColor;
        this.DisplayData.NodeColor = nodeColor;
        // TODO: call code to refresh the path
    }

    // Path Selection

    Selected = false;


    Delete()
    {
        clearPathPlot(this);
        this.PlotLayers.PathLayer = null;
        this.PlotLayers.NodeLayer = null;

        this.Deselect();
        Path.AllPaths = Path.AllPaths.filter(path => path != this);

    }

    ToggleMarkers()
    {
        // toggle visibility of this path's linked marker layer
    }

    
    Select()
    {
        this.Selected = true;
        if (!Path.CurrentSelection.includes(this))
        {       
            // dont accidentally store this same object in our selection list more than once
            Path.CurrentSelection.push(this);
        }
        Path.SelectNode(null);
    }

    Deselect()
    {
        this.Selected = false;
        let index = Path.CurrentSelection.findIndex((val) => val == this);
        Path.CurrentSelection.splice(index, 1);
        Path.SelectNode(null);
        
    };

    ToggleSelect()
    {
        if (this.Selected)
        {
            this.Deselect();
        }
        else
        {
            this.Select();
        }
        updateTable();
    };
    
    AddEvent(pathEvent)
    {
        if (!this.PathEvents.includes(pathEvent))
        
        {
            this.PathEvents.push(pathEvent);
        }
    }

    Download()
    {
        //Download this path

        let json = {
            MMSI: this.MMSI,
            PathData: this.PathData,
            PathEvents: this.PathEvents
        };

        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json, null, 4));
        let downloadHolder = document.createElement('a');
        downloadHolder.setAttribute("href", dataStr);
        downloadHolder.setAttribute("download", this.Name + ".json");
        document.body.appendChild(downloadHolder); // required for firefox
        downloadHolder.click();
        downloadHolder.remove();
    }

    static DownloadFormatted(all = false)
    {
        // Downloads all the paths into a VPGT formatted JSON (not raw AIS)
        let DownloadTarget = all ? Path.AllPaths : Path.CurrentSelection

        // We can't serialize the leafletJS data structures to a file (they contain circular references and a bunch of other internal state)
        // Set all the PlotLayer data to null before serialization and restore them after
        let plotLayers = [];

        DownloadTarget.forEach(path => {
            plotLayers.push(path.PlotLayers);
            path.Selected = false;
            path.PlotLayers = {
                PathLayer : null,
                NodeLayer : null
            };
        });

        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ Paths : DownloadTarget }, null, 4));
        let downloadHolder = document.createElement('a');
        downloadHolder.setAttribute("href", dataStr);
        downloadHolder.setAttribute("download", "FormattedPaths.json");
        document.body.appendChild(downloadHolder); // required for firefox
        downloadHolder.click();
        downloadHolder.remove();

        // Restore PlotLayer data after serialization
        DownloadTarget.forEach((path, index) => {
            path.PlotLayers = plotLayers[index];
            path.Selected = true;
        });

    }

    static SelectNode(nodeID)
    {
        Path.SelectedNode = nodeID;
    }

    PathEvents = [];

    calcPathStats() {
        let currentData = this.PathData;
        let numPoints = currentData.length;
        let totDist = 0;
        let totSpeed = currentData[0][3];
        for(let i=1; i<numPoints; i++){
            let prevPoint = [currentData[i-1][1], currentData[i-1][2]];
            let curPoint = [currentData[i][1], currentData[i][2]];

            totDist += map.distance(prevPoint, curPoint);
            totSpeed += currentData[i][3];
        }
        this.AverageSpeed = totSpeed/numPoints;
        this.Length = totDist/1000;
        this.StartLat = this.PathData[0][1];
        this.StartLon = this.PathData[0][2];

    }



}

class PathEvent
{

    Type = "Unspecified";
    Category = "Other";
    Description = "No description";
    PathNode = 0;
    UserData = {};

    constructor(type, category, description, nodeID)
    {
        this.Type = type || this.Type;
        this.Category = category || this.Category;
        this.Description = description || this.Description;
        this.PathNode = nodeID;
    }
}

//Path.CurrentSelection.forEach((path) => path.Download());