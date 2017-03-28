# SonyCamera

Originally forked from https://github.com/eqot/RemoteCamera

Rebuilt as a library with event support.


## Installation

```
git clone https://github.com/timelapseplus/node-sony-camera.git
cd node-sony-camera
npm install
```

## Usage

```
var SonyCamera = require('SonyCamera');

var cam = new SonyCamera();

cam.on('update', function(param, data) {
	console.log("updated: " + param  + " = " + data.current);
});

cam.connect(); // puts the camera in remote mode and starts monitoring events
```

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

### cam.set(param, value, callback)

Sets a parameter. Check the cam.params property to find available options.


## Demo

![alt text](https://github.com/timelapseplus/node-sony-camera/blob/master/demo/screenshot.png "demo screenshot")

The included demo is a lightweight app to show the basic features, allowing interaction with the camera in realtime with liveview and live-updating parameters.

1. Setup:
```
cd node-sony-camera/demo
npm install
```
2. Connect computer wifi to camera (on the camera, go to Menu->Appication->Smart Remote Control to enable remote wifi mode)

3. Start demo app
```
node ./server.js
```

4. Open http://localhost:3000/



## License

Copyright &copy; 2013-2014 Ikuo Terado, 2017 Elijah Parker. Released under the [MIT license](http://www.opensource.org/licenses/mit-license.php).
