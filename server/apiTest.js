let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let url = 'http://localhost/genPath';
let url2= 'http://localhost/genRandom';

let testUrl = url;

//let apiKey = 'your api';

let data = JSON.stringify({

  latStart : 12,
  lonStart : 13,
  sogg : 14,
  cog : 15,
  heading : 100,
  mmsi : 123456789

});

let object =  new XMLHttpRequest();

object.open('POST',testUrl);

object.setRequestHeader('Content-Type','application/json');
//object.setRequestHeader('apikey',apiKey);

object.onreadystatechange = function (){
if(object.readyState===4){
    console.log(object.responseText);
    //console.log(JSON.parse(object.responseText));
  }
}

object.send(data);
