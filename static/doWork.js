//importScripts("https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js");
importScripts('webWorkerinterpreter.js');

var gameState = {}
var info = {}
var wait = true

self.addEventListener('message', function (e) {
	self.postMessage("EVENT LISTENER")
	var data = e.data
	self.postMessage(data);
	if (data.type === "orders") {
		var ast = data.orders;
		Exec(ast);
	} else if (data.type === "gameState") {
		gameState = data.gameState
	} else if (data.type === "start") {
		self.postMessage("type was start")
		wait = false
		info = data.info;
	}
}, false);