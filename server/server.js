const http = require("http");
const fs = require("fs");
const express = require("express");
const bp = require("body-parser");
const app = express();

const { promisify } = require('util');
const exec = promisify(require('child_process').exec)

const { send, traceDeprecation } = require("process");
const spawnpy = require("child_process").spawn;
const path = require("path");



app.use(bp.urlencoded({ extended: true }));
app.use(bp.json());


const frontEnd = __dirname + "/../frontend/"
app.use(express.static(frontEnd));

app.get('/', (req, res) => {
    res.sendFile("index.html", {root: frontEnd});
});

app.post("/saveConfig", (req, res) => {
    try
    {
        // delete the current one by making it the backup file
        fs.renameSync("./frontend/config.json", "./frontend/config.json.bak");
        // overwrite the main one
        fs.writeFileSync("./frontend/config.json", JSON.stringify(req.body, null, 4));

        res.send({});
    }
    catch (error) {
        res.send(error);
    }
});

app.post('/genPath', (req, res) => {
    console.log(req.body);
    
    

    (async () =>
    {

        //let command = 'echo genPath';
        try
        {
            lat = req.body.latStart;
            lon = req.body.lonStart;
            sog = req.body.sog;
            cog = req.body.cog;
            heading = req.body.heading;
            mmsi = req.body.mmsi;
            pathlen = req.body.pathLength;
            eventpercent = req.body.eventpercent;

            //Make sure all the values are within the correct ranges (unless they are null for now. Checks can behave unexpectedly if run on null values)
            if(lat != null && lat < -90 || lat > 90) throw(`Starting latitude value must be between -90 and 90. Recieved: ${lat}`);
            if(lon != null && lon < -180 || lon > 180) throw(`Starting longitude value must be between -180 and 180. Recieved: ${lon}`);
            if(sog != null && sog < 0) throw(`SOG must be greater than 0. Recieved: ${sog}`);
            if(cog != null && cog < 0 || cog > 360) throw(`Course over ground must be between 0 and 360 degrees. Recieved: ${cog}`);
            if(heading != null && heading < 0 || heading > 360) throw(`Heading must be between 0 and 360 degrees. Recieved: ${heading}`);
            if(mmsi != null && (mmsi < 0 || mmsi.toString().length != 9)) throw(`MMSI must be a 9 digit number. Recieved: ${mmsi}`);
            if(pathlen == null || pathlen < 2 || pathlen > 32) throw(`Path length value must be between 2 and 32. Recieved: ${pathlen}`);
            if(eventpercent == null || eventpercent < 0 || eventpercent > 100) throw(`Event percent must be between 0 and 100 percent. Recieved: ${eventpercent}`);

            let command = `python ./machinelearning/main.py ${lat} ${lon} ${mmsi} ${sog} ${cog} ${heading} ${pathlen} ${eventpercent}`;
            console.log("in genPath");

            let data = await execCommand(command);

            fs.readFile('./machinelearning/generated/generated_path.json', (err, data) => {
                if (err)
                {
                    console.log(err);
                    return;
                }
                console.log(data);
                res.json(JSON.parse(data));
                console.log("Sending response");
            });
        }
        catch (errorData) {
            console.log(errorData);
            console.log("Make sure the post request wasn't ill formed");
            //res.header = 'text/plain';

            let sampleString = JSON.stringify({

                latStart : 12,
                lonStart : 13,
                sog : 14,
                cog : 15,
                heading : 100,
                mmsi : 123456789,
                pathlen : 15,
                eventpercent : 20
                
            }, null, 3);

            errorData += "\nSample command: \n" + sampleString + "\n\nReceived command: \n" + JSON.stringify(req.body, null, 4);

            res.status(500);
            res.send(errorData);
            //res.send("Make sure the post request wasn't ill formed. \n\nExpected\n" + sampleString 
            //+ "\n\nGot\n" + JSON.stringify(req.body));
        };

    })();
});

app.post('/genRandom', (req, res) => {
    console.log(req.body);
    lat = randWithBounds(-90, 90);
    lon = randWithBounds(-180, 180);
    sog = randWithBounds(0, 100);
    cog = randWithBounds(0, 360);
    heading = randWithBounds(0, 360);
    mmsi = Math.floor(Math.random()*1000000000);
    console.log(`latitude: ${lat}\nlongitude: ${lon}\nMMSI: ${mmsi}\nSOG: ${sog}\nCOG: ${cog}\nHeading: ${heading}`);

    let pathlen = Math.floor(randWithBounds(10, 20));
    let eventpercent = Math.floor(randWithBounds(0, 33));

    let command = `python ./machinelearning/main.py ${lat} ${lon} ${mmsi} ${sog} ${cog} ${heading} ${pathlen} ${eventpercent}`;

    (async () => {
        
        let data = await execCommand(command);

        fs.readFile('./machinelearning/generated/generated_path.json', (err, data) => {
            console.log(data);
            res.json(JSON.parse(data));
            console.log("Sending response");
        });
    }) ();
   // console.log(data);
});





function execCommand(command) {
        let done = new Promise((resolve, reject)=> {
           exec(command, (err, stdout, stderr) => {
            console.log(stdout);
             if (err) {
                console.log("in error");
                reject(err);
                return;
            }
            resolve();
           });
       })
       return done;
}




function randWithBounds(min, max){
    let range = max-min;
    return Math.random()*range+ min;
}



//Code to stop the server from accepting new connections.
//After existing connections close, server exits.
app.post('/endServer', (req, res) => {
    console.log('Server: Ending Server');
    res.send({ message: "exit response"});
    nodeServer.close()
});

const host = "localhost";
const port = 80;

var nodeServer = app.listen(port, () => {
    console.log("Server Listening");
});