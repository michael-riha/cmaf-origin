var ts = require('../libs/tail_async');

var tstream = ts.createReadStream("test.txt", {
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
});

/*

tstream.on("eof", function() {
    console.log("send -> data ("+req.url+") EOF | ");
});
*/
