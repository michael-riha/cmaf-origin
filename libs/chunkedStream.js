// "forked" but more stripped and modified from -> https://raw.githubusercontent.com/Juul/tail-stream/master/index.js
var path = require('path');
var stream = require('stream');
var util = require('util');
var fs = require('fs');

function ChunkedStream(filepath, opts) {
    //call the stream.Readable constructor
    ChunkedStream.super_.call(this, opts);

    this.dataAvailable = false; // to prevent pushing data upfront before we open the file
    this.lastSize = null; //for truncating might be DELTED
    this.bytesRead = 0; // how many byte of a file have already been read 
    this.watching = false;
    this.originalPath= filepath; // original path from the http.request to `filder/file.mp4` to display for debug reason
    this.path = path.resolve(filepath); 
    
    this.EOFtimeout = null; // this is the timeout id to clear when a files is changed but a timer is already set because file is fully read
    this.EOFduration= 600; // how long do we set the timeout when file is fully read and before end of file is emitted
    this.startMarker= null; // time marker to benchmark between timeout is set and is cleared because file has changed
    this.endMarker= null; // end maker when timeout is cleared


    this.opts = {
        beginAt: 0,
        detectTruncate: true,
        onTruncate: 'end', // or 'reset' to seek to beginning of file
        endOnError: false,
        useWatch: true,
        waitForCreate: false
    };

    for(var key in opts) {
        this.opts[key] = opts[key];
    }
    console.log("ChunkedStream options set:", this.opts);    
    //process.exit();
    this._start = function() {
        this.firstRead = true;
        this.waitingForReappear = false;
        fs.open(this.path, 'r', (err, fd) => {
            if(err) {
                if(!this.opts.waitForCreate) { throw e; }
                this.fd = null;
                this.dataAvailable = false;
                this.waitForFileToReappear();
            }
            else {
                this.fd = fd;
                this.dataAvailable = true;
                this._read();
            }
        });
    };

    this.waitForFileToReappear = function() {
        // if we're using fs.watch, cancel it
        // since it follows moved files
        // we will switch to fs.watchFile
        // until a file re-appears at this.path
        if(this.opts.useWatch) {
            if(this.watcher && this.watcher.close) {
                this.watcher.close();
            }
            this.watcher = null;
        }
        if(this.fd) {
            this.fd = fs.closeSync(this.fd);
        }
        this.waitingForReappear = true;
        this.waitForMoreData(true);
    };

    // If forceWatchFile is true always use fs.watchFile instead of fs.watch
    this.waitForMoreData = function(forceWatchFile) {
        if(this.watcher) {
            return;
        }
        if(this.opts.useWatch && !forceWatchFile) {
            this.watcher = fs.watch(this.path, {persistent: true}, (event, filename) => {
                if(event === 'change') {
                    console.log("File ("+this.originalPath+") has changed");
                    this.deleteEOF();
                    this.dataAvailable = true;
                    this.read(0);
                }
            });
        }
    };

    this.error = function(msg, code) {
        if(this.opts.endOnError) {
            this.end(code);
        } else {
            this.emit('error', msg);
        }
    };

    this.end = function(errCode) {
        this.dataAvailable = false;
        this.closed = true;
        if(this.fd) {
            this.fd = fs.closeSync(this.fd);
        }
        this.push(null);
        if(this.watcher) {
            if(this.watcher.close) {
                this.watcher.close();
            }
            this.watcher = null;
        }
    };

    this._read = function(size) {
        if(!this.dataAvailable) {
            return this.push('');
        }

        if(!this.path) {
            return this._readCont();
        }
        if((this.opts.detectTruncate || (this.firstRead && (this.opts.beginAt == 'end')))) {
            // check for truncate
            fs.stat(this.path, (err, stat) => {
                this._readCont.call(this, err, stat);
            });
        } else {
            this._readCont();
        }
    };

    this._readCont = function(err, stat) {
        if(err) {
            if(err.code == 'ENOENT') {
                    this.error("File deleted", err.code);
            }
            stat = null;
        }

        if(stat) {
            // seek to end of file
            if(this.firstRead && (this.opts.beginAt == 'end')) {
                this.bytesRead = stat.size;
                this.dataAvailable = false;
                this.waitForMoreData();
                this.push('');
                this.firstRead = false;
                return;
            }

            // truncate detection
            if(!this.lastSize) {
                this.lastSize = stat.size;
            } else {
                if(stat.size < this.lastSize) {
                    this.emit('truncate', stat.size, this.lastSize);
                    if(this.opts.onTruncate == 'reset') {
                        this.bytesRead = 0;
                    } else {
                        this.end();
                        return;
                    }
                }
            }
            this.lastSize = stat.size;
        }

        // seek to desired start position
        if(this.firstRead) {
            if(parseInt(this.opts.beginAt) > 0) {
                this.bytesRead = parseInt(this.opts.beginAt);
            }
            this.firstRead = false;
        }
        if(!this.fd) {
            return false;
        }

        var buffer = Buffer.alloc(16 * 1024);
        fs.read(this.fd, buffer, 0, buffer.length, this.bytesRead, (err, bytesRead) => {
            if(err) {
                if(this.opts.endOnError) {
                    this.end(err.code);
                    return;
                } else {
                    this.waitForMoreData();
                    this.push('');
                    this.emit('error', err);
                }
            }

            if(bytesRead === 0) {
                this.dataAvailable = false;
                this.waitForMoreData();
                this.push('');
                //this.emit('eof');
                this.emitEOF();
                return;
            }
            if(!this.destroyed) {
                this.bytesRead += bytesRead;
                if(!this.push(buffer.slice(0, bytesRead))) {
                    // TDOD: Maybe something should be done of the downstream consumer returns false?
                }
            }
        });
    };

    this.emitEOF= () => {
        // https://blog.abelotech.com/posts/measure-execution-time-nodejs-javascript/
        this.startMarker = process.hrtime();
        console.log("emit EOF in 1 sec");
        this.EOFtimeout= setTimeout(() => {
            this.endMarker = process.hrtime(this.startMarker);
            console.log("emit EOF now. (hr): %ds %dms", this.endMarker[0], this.endMarker[1] / 1000000)
            this.emit('eof');
            this.end();
        }, 600);
    }

    this.deleteEOF= () => {
        // https://stackoverflow.com/questions/16672743/javascript-null-check
        if(this.EOFtimeout!== null) {
            clearTimeout(this.EOFtimeout);
            // method returns the current high-resolution real time in a [seconds, nanoseconds] tuple Array -> https://nodejs.org/api/process.html#process_process_hrtime_time
            this.endMarker = process.hrtime(this.startMarker);
            console.info('stopped EOF -> Execution time between timeout & clear (hr): %ds %dms', this.endMarker[0], this.endMarker[1] / 1000000)
        }
    }
    //beginn the whole process
    this._start();
}
util.inherits(ChunkedStream, stream.Readable);
module.exports = chs = {
    createReadStream: function(path, options) {
        return new ChunkedStream(path, options);
    }
};