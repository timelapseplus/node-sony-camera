var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SonyCamera = require("../index.js");

var cam = new SonyCamera();

cam.on('update', function(param, value) {
	io.emit('update', param, value);
});
cam.on('liveviewJpeg', function(image) {
	if(image) io.emit('image', image.toString('base64'));
});

cam.connect();

app.get('/', function(req, res){
  res.sendFile(__dirname + '/static/index.html');
});
app.get('/jquery.js', function(req, res){
  res.sendFile(__dirname + '/static/jquery.js');
});

io.on('connection', function(socket){
  io.emit('params', cam.params);
  socket.on('capture', function(){
  	cam.capture(true, function(err, name, image) {
  		if(err) {
  			return io.emit("status", "Error: " + err);
  		}
  		if(image) io.emit('image', image.toString('base64'));
  		if(name && !image) io.emit('status', "new photo: " + name);
  	});
  });
  socket.on('startViewfinder', function(){
  	console.log("starting liveview");
  	cam.startViewfinder();
  });
  socket.on('stopViewfinder', function(){
  	cam.stopViewfinder();
  });
  socket.on('set', function(param, value){
  	cam.set(param, value);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});