var express = require('express');
var nowjs = require('now');

var server = express.createServer();

var everyone = nowjs.initialize(server, {socketio: {"log level": process.argv[2]}});

server.set('view options', {
	layout: false
});

server.set('view engine', 'ejs');

server.use(express.errorHandler({ dumpExceptions: true, showStack: true}));

server.set('views', __dirname + "/views");
server.use("/static", express.static(__dirname+"/static"));

server.get('/', function (req, res) {
	res.render("index");
});

server.listen(80);
console.log("Express server started")