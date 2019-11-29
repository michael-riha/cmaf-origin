var fs = require('fs')
var http = require('http')
var url = require('url')

console.log("current folder:", __dirname);
var myArgs = process.argv.slice(2);
console.log("current args:", myArgs);
//https://nodejs.org/en/knowledge/command-line/how-to-parse-command-line-arguments/
console.log(process.argv);

var buf=function(res,fd,i,s,buffer){
 if(i+buffer.length<s){
  fs.read(fd,buffer,0,buffer.length,i,function(e,l,b){
   res.write(b.slice(0,l))
   //console.log(b.toString('utf8',0,l))
   i=i+buffer.length
   buf(res,fd,i,s,buffer)
  })
 }
 else{
  fs.read(fd,buffer,0,buffer.length,i,function(e,l,b){
   res.end(b.slice(0,l))
   fs.close(fd)
  })
 }
}

/*
var app = function(req,res){
 var head={'Content-Type':'text/html; charset=UTF-8'}
 switch(req.url.slice(-3)){
  case '.js':head={'Content-Type':'text/javascript'};break;
  case 'css':head={'Content-Type':'text/css'};break;
  case 'png':head={'Content-Type':'image/png'};break;
  case 'ico':head={'Content-Type':'image/x-icon'};break;
  case 'ogg':head={'Content-Type':'audio/ogg'};break;
  case 'ebm':head={'Content-Type':'video/webm'};break;
 }
 head['Transfer-Encoding']='chunked'
 res.writeHead(200,head)
 fs.open('.'+req.url,'r',function(err,fd){
  fs.fstat(fd,function(err, stats){
   console.log('.'+req.url+' '+stats.size+' '+head['Content-Type']+' '+head['Transfer-Encoding'])
   var buffer = new Buffer(100)
   buf(res,fd,0,stats.size,buffer)
  })
 })
}
*/

var app = function(req,res){
  //console.log("file was requested:", req.url);
  console.log("request method", req.method);
 if(req.method==="PUT") {
   //console.log("used put", req.url);
   var reg= /([a-zA-Z0-9\s_\\.\-\(\):])+(.m4s|.mp4|.mpd|.m3u8)$/
   var urlObj= url.parse(req.url);
   console.log("url", urlObj);
   var fileName= urlObj.path.split("/")[1];
   console.log("fileName", fileName);
   var extensions = fileName.match( reg );
      if(extensions){
        res.writeHead(200)
        var writable = fs.createWriteStream('/Users/michael.riha/www/experiments/CMAF_Origin_Server/out/'+fileName);
        req.pipe(writable);
        req.on('data', function(data){
             //console.log("send data length", data.length);
         })

         req.on('end', function(data){
              //console.log("all data are sent");
              req.unpipe();
              res.end();
          })
      }else{
      	console.log("this is no valid file we do not store it");
        var head={'Content-Type':'text/html'}
        res.writeHead(403, head);
        res.write("this file is not allowed to be stored!");
      }

 } else if(req.method==="GET") {
   var head={'Content-Type':'text/html',
   'Access-Control-Allow-Origin': '*'}
   res.writeHead(200,head)
   switch(req.url.slice(-3)){
    case '.js':head={'Content-Type':'text/javascript'};break;
    case 'css':head={'Content-Type':'text/css'};break;
    case 'png':head={'Content-Type':'image/png'};break;
    case 'ico':head={'Content-Type':'image/x-icon'};break;
    case 'ogg':head={'Content-Type':'audio/ogg'};break;
    case 'ebm':head={'Content-Type':'video/webm'};break;
   }
   res.writeHead(200,head)
   var file_stream = fs.createReadStream('./out'+req.url);
   file_stream.on("error", function(exception) {
     console.error("Error reading file: ", exception);
   });
   file_stream.on("data", function(data) {
     console.log("write data", data);
     res.write(data);
   });
   file_stream.on("close", function() {
     res.end();
   });
 } else if(req.method==="DELETE") {
   console.log("DELETE"+req.url);
   fs.unlinkSync('./out'+req.url);
   console.log("deleted file");
 }
}

http.createServer(app).listen(myArgs[1])
console.log('GET http://127.0.0.1:'+myArgs[1])
