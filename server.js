var express = require('express');
var nowjs = require('now');

var server = express.createServer();

var everyone = nowjs.initialize(server, {socketio: {"log level": process.argv[2]}});

server.set('view options', {
	layout: false
});

server.set('view engine', 'ejs');

server.use(express.errorHandler({ dumpExceptions: true, showStack: true}));
server.use(express.bodyParser());

server.set('views', __dirname + "/views");
server.use("/static", express.static(__dirname+"/static"));

server.get('/', function (req, res) {
	res.render("index");
});

server.post('/test', function (req, res) {
	console.log("POSTED TO TEST");
	res.send(req.body);
});

//for now assume a 10x10 board and each player has two ships, with no fog-of-war
//always assign left player first.

//board is [0-9][0-9]
server.post('/start', function (req, res) {
	if (players.playerLeft == null) {
		console.log("assigning left player");
		players.playerLeft = "playerLeft"

		var ret = {
			id: 'playerLeft',
			gameState: {
				playerShips: playerLeftShips,
				board: board,
				visibleEnemyShips: playerRightShips
			}
		}
		res.send(ret)

	} else if (players.playerRight == null) {
		console.log("assigning right player");
		players.playerRight = "playerRight";

		var ret = {
			id: 'playerRight',
			gameState: {
				playerShips: playerRightShips,
				board: board,
				visibleEnemyShips: playerLeftShips
			}
		}
		res.send(ret);
		
	} else {
		console.log("??????????");
	}

});

server.post('/order', function (req, res) {
	console.log('receiving orders');
	var orders = req.body;
	console.log(orders)
	var player = orders.id
	if (player == players.playerLeft && leftOrderQueue.length == 0) {
		console.log("left player's orders received");
		console.log(orders);
		leftOrderQueue.push(orders);
		res.send('ok');

	} else if (player == players.playerRight && rightOrderQueue.length == 0) {
		console.log("right player's orders received");
		console.log(orders);
		rightOrderQueue.push(orders)
		res.send('ok');
	} else {
		console.log("already got too many orders");
		res.send('not ok');
	}
});

server.post("/getBoardState", function (req, res) {
	console.log("GETTING BOARD STATE");
	console.log(board)
});



var createShip = function (id, x, y) {
	var ret = {
		shipId: id, 
		position: {x: x, y: y}, 
		type: 'ship' 
	}
	return ret
}

//function called at the very beginning to create a board
var playerLeftShips = null;
var playerRightShips = null;
var board = null;

var players = {
	playerLeft: null,
	playerRight: null
}

var leftOrderQueue = [];
var rightOrderQueue = [];

var initialize = function () {

	board = new Array(10);

	for (var i = 0; i < 10; i++) {
		board[i] = new Array(10);
	}

	for (var i = 0; i < 10; i++) {
		for (var j = 0; j < 10; j++) {
			board[i][j] = {shipId: null, position: null, type: "space"};
		}
	}

	var leftShip1 = createShip(0,0,0);
	var leftShip2 = createShip(1,0,1);

	playerLeftShips = [leftShip1, leftShip2];

	var rightShip1 = createShip(0,9,9);
	var rightShip2 = createShip(1,9,8);

	playerRightShips = [rightShip1, rightShip2];

	board[0][0] = leftShip1;
	board[0][1] = leftShip2;

	board[9][9] = rightShip1;
	board[9][8] = rightShip2;
}

initialize();

server.listen(80);
console.log("Express server started")