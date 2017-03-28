# SonyCamera

Originally forked from https://github.com/eqot/RemoteCamera

Rebuilt as a library with event support.


## Installation

```
npm install sony-camera
```
Or, for development and using the demo app:
```
git clone https://github.com/timelapseplus/node-sony-camera.git
cd node-sony-camera
npm install
```

# Usage

```
var SonyCamera = require('sony-camera');

var cam = new SonyCamera();

cam.on('update', function(param, data) {
	console.log("updated: " + param  + " = " + data.current);
});

cam.connect(); // puts the camera in remote mode and starts monitoring events
```

## Properties

### cam.params

Contains a list of parameters available.  Example:
  ```
  cam.params: 
   { cameraFunction: { current: 'Remote Shooting', available: [Object] },
     postviewImageSize: { current: '2M', available: [Object] },
     shootMode: { current: 'still', available: [Object] },
     exposureMode: { current: 'Manual', available: [] },
     flashMode: { current: 'on', available: [] },
     focusMode: { current: 'MF', available: [Object] },
     isoSpeedRate: { current: '1250', available: [Object] },
     shutterSpeed: { current: '1/60', available: [Object] },
     fNumber: { current: '5.6', available: [Object] }
   }
 ```

## Methods

### cam.connect(callback)

Puts the camera in remote control mode and starts monitoring events.  Required before calling any other methods.

### cam.disconnect(callback)

Disables remote control mode and stops monitoring events.  After disconnecting, cam.connect() will have to be called before any other methods.

### cam.set(param, value, callback)

Sets a parameter. Check the cam.params property to find available options.  The (optional) callback has an error argument.
```
// example
cam.set('fNumber', '5.6');
```
### cam.capture([multipleCallback,] callback)

Takes a picture. If set, optional multipleCallback boolean argument, causes the callback to be called twice -- once when the capture is complete (includes image name), and again when the image is downloaded.  If there is an error, the callback is not called again. 
```
// example
cam.capture(true, function(err, name, imageData) {
	if(err) {
		console.log("error: ", err);
	}
	if(image) {
		console.log("received image buffer for " + name + " with a length of " + imageData.length + "bytes");
	} else if(name) {
		console.log("capture complete: " + name);
	}
});
```

### cam.startViewfinder(callback)
Starts streaming liveview, firing the "liveviewJpeg" event repeatedly for each liveview frame until cam.stopViewfinder() is called.

### cam.stopViewfinder(callback)
Stops streaming liveview, disabling the "liveviewJpeg" event.

## Events

### cam.on('update', function(param, data))

Fired whenever a parameter on the camera changes. The data object has two properties: data.current (the current value), and data.available, an array of possible options.

### cam.on('liveviewJpeg', function(jpegBuffer))

Fired repeatedly when liveview is enabled.  Returns a buffer with the jpeg data for the current frame.

# Demo

![alt text](https://github.com/timelapseplus/node-sony-camera/blob/master/demo/screenshot.png "demo screenshot")

The included demo is a lightweight app to show the basic features, allowing interaction with the camera in realtime with liveview and live-updating parameters.

### 1. Setup:
```
cd node-sony-camera/demo
npm install
```
### 2. Connect computer wifi to camera 
On the camera, go to Menu->Appication->Smart Remote Control to enable remote wifi mode, then connect the computer to the wifi network shown on the camera screen.

### 3. Start demo app
```
node ./server.js
```

### 4. Open http://localhost:3000/



## License

Copyright &copy; 2013-2014 Ikuo Terado, 2017 Elijah Parker. Released under the [MIT license](http://www.opensource.org/licenses/mit-license.php).
