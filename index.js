'use strict';

var fs = require('fs');
var url = require('url');
var http = require('http');
var semver = require('semver');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var minVersionRequired = '2.1.4';

(function () {

  var SonyCamera = function (url, port, path) {
    this.url = url || '192.168.122.1';
    this.port = port || 8080;
    this.path = path || '/sony/camera';

    this.rpcReq = {
      id: 1,
      version: '1.0'
    };

    this.params = {};
    this.status = "UNKNOWN";

    this.connected = false;
    this.ready = false;
    this.availableApiList = [];
  };

  util.inherits(SonyCamera, EventEmitter);

  SonyCamera.prototype.show = function () {
    console.log(this.url + ':' + this.port + this.path);
  };

  SonyCamera.prototype.call = function (method, params, callback) {
    var self = this;
    this.rpcReq.method = method;
    this.rpcReq.params = params || [];
    var postData = JSON.stringify(this.rpcReq);

    var timeoutHandle = null;

    var req = http.request({
      method: 'POST',
      hostname: this.url,
      port: this.port,
      path: this.path,
      timeout: 2000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, function (res) {
      //console.log(res);
      res.setEncoding('utf8');
      var rawData = '';
      res.on('data', function(chunk) {
        rawData += chunk;
      });
      var parsedData = null;
      res.on('end', function() {
        clearTimeout(timeoutHandle);
        try {
          parsedData = JSON.parse(rawData);
          var result = parsedData ? parsedData.result : null;
          var error = parsedData ? parsedData.error : null;
          //console.log(result);
          if(error) {
            if(error.length > 0 && error[0] == 1 && method == 'getEvent') {
              setTimeout(function() {
                self.call(method, params, callback); 
              });
              return;
            }
            console.log("SonyWifi: error during request", method, error);
          }
          //console.log("completed", error, result);
          callback && callback(error, result);
        } catch (e) {
          console.log(e.message);
          callback && callback(e);
        }
      });

    });

    timeoutHandle = setTimeout(function() {
      req.abort();
      console.log("SonyWifi: network appears to be disconnected");
      self.emit('disconnected');
    }, 30000);

    req.write(postData);
    req.end();

    req.on('error', function(err){
      if(err && err.code) {
        console.log("SonyWifi: network appears to be disconnected");
        self.emit('disconnected');
      }
      callback && callback(err);
    });
  };

  SonyCamera.prototype._processEvents = function (waitForChange, callback) {
    var self = this;
    this.eventPending = true;
    this.call('getEvent', [waitForChange || false], function (err, results) {
      self.eventPending = false;
      // console.log(err);
      if (!err) {
        for(var i = 0; i < results.length; i++) {
          var item = results[i];
          if(item instanceof Array) {
            if(item.length > 0) {
              item = {
                type: item[0].type,
                items: item
              }
            } else {
              continue;
            }
          }
          if(!item) {
            continue;
          } else if(item.type && item.type == 'cameraStatus') {
            self.status = item.cameraStatus;
            if(self.status == "NotReady") {
              self.connected = false;
              console.log("SonyWifi: disconnected, trying to reconnect");
              setTimeout(function(){self.connect(); }, 2500);
            }
            if(self.status == "IDLE") self.ready = true; else self.ready = false;
            if(self.status != item.cameraStatus) {
              self.emit('status', item.cameraStatus);
              console.log("SonyWifi: status", self.status);
            }
          } else if(item.type && item.type == 'storageInformation') {
            for(var j = 0; j < item.items.length; j++) {
              if(item.items[j].recordTarget) {
                self.photosRemaining = item.items[j].numberOfRecordableImages || 0;
              }
            }
          } else if(item.type && item.type == 'availableApiList') {
            self.availableApiList = item.names || [];
          } else if(item.type && item[item.type + 'Candidates']) {
            var oldVal = self.params[item.type] ? self.params[item.type].current : null;
            self.params[item.type] = {
              current: item['current' + item.type.charAt(0).toUpperCase() + item.type.slice(1)],
              available: item[item.type + 'Candidates'],
            }
            if(oldVal !== self.params[item.type].current) {
              console.log(item.type + " = " + self.params[item.type].current);
              self.emit("update", item.type, self.params[item.type]);
            }
          } 
        }
      }

      if (callback) {
        callback(err);
      }
    });
  };

  SonyCamera.prototype.connect = function (callback) {
    var self = this;
    if(this.connecting) return callback && callback('Already trying to connect');
    this.connecting = true;
    console.log("SonyWifi: connecting...");
    this.getAppVersion(function(err, version) {
      if(!err && version) {
        console.log("SonyWifi: app version", version);
        if(semver.gte(version, minVersionRequired)) {
          self.call('startRecMode', null, function(err) {
            if(!err && !self.connected) {
              self.connected = true;
              var _checkEvents = function(err) {
                if(!err) {
                  if(self.connected) self._processEvents(true, _checkEvents); else console.log("SonyWifi: disconnected, stopping event poll");
                } else {
                  setTimeout(_checkEvents, 5000);
                }
              };
              self._processEvents(false, function(){
                self.connecting = false;
                callback && callback(err);
                _checkEvents();
              });
            } else {
              self.connecting = false;
              callback && callback(err);
            }
          });
        } else {
          callback(
            {
              err: 'APPVERSION',
              message:'Could not connect to camera -- remote control application must be updated (currently installed: ' + version + ', should be ' + minVersionRequired + ' or newer)'
            }
          );
        }
      } else {
        self.connecting = false;
        callback && callback(err);
      }
    });
  };

  SonyCamera.prototype.disconnect = function (callback) {
    this.call('stopRecMode', null, function(err) {
      if(!err) {
        this.connected = false;
      }
      callback && callback(err);
    });
  };

  SonyCamera.prototype.startViewfinder = function (req, res) {
    var self = this;
    this.call('startLiveview', null, function (err, output) {
      var liveviewUrl = url.parse(output[0]);
      //console.log(liveviewUrl);

      var COMMON_HEADER_SIZE = 8;
      var PAYLOAD_HEADER_SIZE = 128;
      var JPEG_SIZE_POSITION = 4;
      var PADDING_SIZE_POSITION = 7;

      var jpegSize = 0;
      var paddingSize = 0;
      var bufferIndex = 0;

      var liveviewReq = http.request(liveviewUrl, function (liveviewRes) {
        var imageBuffer;

        var buffer = Buffer.alloc ? Buffer.alloc(0) : new Buffer(0);

        liveviewRes.on('data', function (chunk) {
          if (jpegSize === 0) {
            buffer = Buffer.concat([buffer, chunk]);

            if (buffer.length >= (COMMON_HEADER_SIZE + PAYLOAD_HEADER_SIZE)) {
              jpegSize =
                buffer.readUInt8(COMMON_HEADER_SIZE + JPEG_SIZE_POSITION) * 65536 +
                buffer.readUInt16BE(COMMON_HEADER_SIZE + JPEG_SIZE_POSITION + 1);

              imageBuffer = Buffer.alloc ? Buffer.alloc(jpegSize) : new Buffer(jpegSize);

              paddingSize = buffer.readUInt8(COMMON_HEADER_SIZE + PADDING_SIZE_POSITION);

              buffer = buffer.slice(8 + 128);
              if (buffer.length > 0) {
                buffer.copy(imageBuffer, bufferIndex, 0, buffer.length);
                bufferIndex += buffer.length;
              }
            }
          } else {
            chunk.copy(imageBuffer, bufferIndex, 0, chunk.length);
            bufferIndex += chunk.length;

            if (chunk.length < jpegSize) {
              jpegSize -= chunk.length;
            } else {
              self.emit('liveviewJpeg', imageBuffer);
              buffer = chunk.slice(jpegSize + paddingSize);
              jpegSize = 0;
              bufferIndex = 0;
            }
          }
        });

        liveviewRes.on('end', function () {
          console.log('End');
        });

        liveviewRes.on('close', function () {
          console.log('Close');
        });
      });

      liveviewReq.on('error', function(e) {
        console.error('Error: ', e);
      });

      liveviewReq.end();
    });
  };

  SonyCamera.prototype.stopViewfinder = function (callback) {
    this.call('stopLiveview', null, callback);
  };

  SonyCamera.prototype.capture = function (enableDoubleCallback, callback) {
    var self = this;

    if(!callback && typeof enableDoubleCallback == "function") {
      callback = enableDoubleCallback;
      enableDoubleCallback = false;
    }

    if(this.status != "IDLE") return callback && callback('camera not ready');
    //if(!this.ready) return callback && callback('camera not ready');
    this.ready = false;

    var processCaptureResult = function(err, output) {
      if (err) {
        if(err.length > 0 && err[0] == 40403) { // capture still in progress
          self.call('awaitTakePicture', null, processCaptureResult);
        } else {
          callback && callback(err);
        }
        return;
      }

      var url = output[0][0];

      var parts = url.split('?')[0].split('/');
      var photoName = parts[parts.length - 1];
      console.log("SonyWifi: Capture complete:", photoName);

      if(enableDoubleCallback) callback && callback(err, photoName);

      http.get(url, function(res) {
        //res.setEncoding('binary');

        var statusCode = res.statusCode;
        var contentType = res.headers['content-type'];

        var error;
        if (statusCode !== 200) {
          error = new Error('Request Failed. Status Code:', statusCode);
        }
        if (error) {
          //console.log(error.message);
          // consume response data to free up memory
          res.resume();
          callback && callback(err);
          return;
        }

        var rawData = [];
        res.on('data', function(chunk) {
          //console.log("got data", chunk.length);
          rawData.push(chunk);
        });
        res.on('end', function() {
          console.log("SonyWifi: Retrieved preview image:", photoName);
          callback && callback(null, photoName, Buffer.concat(rawData));
        });
      }).on('error', function(e) {
        callback && callback(e);
      });
    }

    self.call('actTakePicture', null, processCaptureResult);
  };

  SonyCamera.prototype.zoomIn = function (callback) {
    this.call('actZoom', ['in', 'start'], callback);
  };

  SonyCamera.prototype.zoomOut = function (callback) {
    this.call('actZoom', ['out', 'start'], callback);
  };

  SonyCamera.prototype.getAppVersion = function (callback) {
    this.call('getApplicationInfo', null, function(err, res) {
      var version = null;
      if(!err && res && res.length > 1) {
        version = res[1];
      }
      callback && callback(err, version);
    });
  };

  SonyCamera.prototype.set = function (param, value, callback) {
    if(this.status != "IDLE") return callback && callback('camera not ready');

    var action = 'set' + param.charAt(0).toUpperCase() + param.slice(1);
    if(this.availableApiList.indexOf(action) === -1 || !this.params[param]) {
      return callback && callback("param not available");
    }
    if(this.params[param].available.indexOf(value) === -1) {
      return callback && callback("value not available");
    }
    this.call(action, [value], callback);
  };


  // Client-side export
  if (typeof window !== 'undefined' && window.SonyCamera) { window.SonyCamera = SonyCamera; }
  // Server-side export
  if (typeof module !== 'undefined') { module.exports = SonyCamera; }

}());
