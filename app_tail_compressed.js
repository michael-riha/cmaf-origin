var fs = require('fs')
var http = require('http')
var url = require('url')
var zlib = require('zlib')
var ts = require('./libs/tail');

// this is the basic webserver
var app = function(req,res){
console.log("request method", req.method);
if(req.method==="PUT" || req.method==="POST") {
   console.log("used put or post to write ->", req.url);
   var urlObj= url.parse(req.url);
   var urlObj= url.parse(req.url);
   //console.log("url", urlObj);
   var fileName=urlObj.path.split("/")[1];
   console.log("fileName", fileName);
   var reg= /([a-zA-Z0-9\s_\\.\-\(\):])+(.m4s|.m4a|.m4v|.mp4|.mpd|.m3u8)$/ // just m4s, m4v, m4a, mpd, m3u8 - Files are allowed
   var extensions = fileName.match(reg);
   if(extensions){
      res.writeHead(200)
      var writable = fs.createWriteStream(output_folder+"/"+fileName);
      req.pipe(writable);
      req.on('data', function(data){
        console.log("write <- data ("+req.url+")  length ", data.length);
      })
      req.on('end', function(data){
        console.log("write <- data ("+req.url+")  END | ");
        req.unpipe();
        res.end();
      })
    } else {
      console.log("this is no valid file we do not store it");
      var head={'Content-Type':'text/html'}
      res.writeHead(403, head);
      res.write("this file is not allowed to be stored!");
    }

} else if(req.method==="GET") {
   console.log("used get", req.url);
   var head={'Content-Type':'text/html',
   'Access-Control-Allow-Origin': '*'}
   switch(req.url.slice(-3)){
    case '.js':head={'Content-Type':'text/javascript'};break;
    case 'css':head={'Content-Type':'text/css'};break;
    case 'png':head={'Content-Type':'image/png'};break;
    case 'ico':head={'Content-Type':'image/x-icon'};break;
    case 'ogg':head={'Content-Type':'audio/ogg'};break;
    case 'ebm':head={'Content-Type':'video/webm'};break;
   }
   // deliver a basic player (BITMOVIN) to monitor this server
   if(req.url=="/player") {
    res.writeHead(200,head)
    var data= fs.readFileSync("player/index.html")
    res.write(data);
    res.end();
   } else {
    console.log("deliver a cmaf A/V-File ("+output_folder+req.url+") compressed");
    res.setHeader('content-encoding', 'gzip')
    res.setHeader('Content-Type', 'video/iso.segment')
    res.writeHead(200,head)
    // Create a Gzip Transform Stream -> https://stackoverflow.com/questions/59329342/how-to-send-chunked-gzip-response-to-browser-from-node-js
    const gzip = zlib.createGzip();
    // Pipe the Gzip Transform Stream into the Response stream
    gzip.pipe(res);
    // lets continuesly deliver the Files that get written during delivery in a (`tail -f`-way) with a custom `stream.Readable`
    var tstream = ts.createReadStream(output_folder+req.url, {
      beginAt: 0,
      detectTruncate: true,
      waitForCreate: true,
      //onTruncate: 'reset',
      endOnError: true
    });
    tstream .on("error", function(exception) {
      console.error("Error reading file: ", exception);
    });
    tstream .on("data", function(data) {
      console.log("send -> data ("+req.url+")", data.length);
      gzip.write(data);
      gzip.flush();
      //res.write(data);
    });
    tstream.on("eof", function() {
      console.log("send -> data ("+req.url+") EOF | ");
      gzip.end();
      //res.end();
    });
   }
 } else if(req.method==="DELETE") { //ffmpeg also deletes the via PUT/POST provided files if you set the `remove_at_exit`-Flag for the dash-muxer
   console.log("DELETE "+req.url);
   fs.unlinkSync(output_folder+req.url);
 }
}

console.log("current folder:", __dirname);
var myArgs = process.argv.slice(2);
console.log("current args:", myArgs);
var output_folder= myArgs[1]
//https://nodejs.org/en/knowledge/command-line/how-to-parse-command-line-arguments/
console.log(process.argv);

http.createServer(app).listen(parseInt(myArgs[0]))
console.log('GET http://127.0.0.1:'+myArgs[0]+" using folder -> "+myArgs[1]+"/")
