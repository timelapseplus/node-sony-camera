# SonyCamera

This aims to communicate with Sony camera through [Camera Remote API SDK](http://developer.sony.com/develop/cameras/) from web app which is implemented in JavaScript.

Forked from https://github.com/eqot/RemoteCamera


## Technical details

This contains two parts, server- and client-side code.

Server-side code is implemented for client to communicate with Sony camera.
Since Camera Remote API does not support [CORS](http://www.w3.org/TR/cors/) unfortunately, client-side code in browser cannot access to Sony camera directly. So this server-side code helps for API call from client to Sony camera to be bypassed.
Also the server supports that liveview data from Sony camera is converted into motion JPEG so that the client can easily show the liveview in HTML file.

Client-side code is a main part which has UI widgets for controlling Sony camera and showing liveview.


## How to use

```
git clone https://github.com/eqot/RemoteCamera.git
cd RemoteCamera
npm install && bower install
grunt build
npm start
```


## Limitations

* Since this has not supported device discovery yet, ip address and port number for Sony camera is hard-coded for [DSC-QX100](http://developer.sony.com/devices/cameras/sony-smartphone-attachable-lens-style-camera-dsc-qx100/)


## License

Copyright &copy; 2013-2014 Ikuo Terado. Released under the [MIT license](http://www.opensource.org/licenses/mit-license.php).
