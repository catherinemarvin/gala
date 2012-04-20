var express = require('express');
var nowjs = require('now');
var logic = require('./gameLogic');

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

server.get('/spectate', function (req, res) {
	res.render("spectate");
});

server.get('/raphael', function (req, res) {
	res.render('raphael');
})

server.post('/test', function (req, res) {
	console.log("POSTED TO TEST");
	res.send(req.body);
});

var responseStreams = {
	"playerLeft" : null,
	"playerRight" : null
}

var t = null

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
		//console.log("SENDING");
		//console.log(ret)
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
		//start the timer for both players
		t = setTimeout(update,10000)
		
	} else {
		console.log("??????????");
	}

});



server.post('/order', function (req, res) {
	console.log('receiving orders');
	var orders = req.body;
	orders.orders = JSON.parse(orders.orders)
	var player = orders.id
	if (player === players.playerLeft && leftOrderQueue.length == 0) {
		console.log("left player's orders received");
		leftOrderQueue.push(orders);
		//res.send('ok');

	} else if (player === players.playerRight && rightOrderQueue.length == 0) {
		console.log("right player's orders received");
		//console.log(orders);
		rightOrderQueue.push(orders)
		//res.send('ok');
	} else {
		console.log("already got too many orders");
		//res.send('not ok');
	}
	responseStreams[player] = res;

	//update()
	//update(player,res)
	
});

server.post("/getBoardState", function (req, res) {
	console.log("GETTING BOARD STATE");
	console.log(board)
	res.send(board)
});

//LONG POLLING.
//TODO: add timer so if you write bad code that loops forever, the game continues.
//Related: make game tick every second or so so the game is actually watchable.

var update = function () {
	console.log("called update");

	if (leftOrderQueue.length != 0 && rightOrderQueue.length != 0) {
		console.log("got all the orders");
	} else {
		console.log("don't have all the orders");
	}
	console.log("updating!");
	//clearTimeout(t);
	//console.log(leftOrderQueue);
	//console.log(rightOrderQueue);
	var leftOrders = leftOrderQueue.shift();
	var rightOrders = rightOrderQueue.shift();
	//console.log("orders should be empty now");
	//console.log(leftOrderQueue);
	//console.log(rightOrderQueue);
	executeOrders(leftOrders, rightOrders);
	
	var leftRet = {
		id: 'playerLeft',
		gameState: {
			playerShips: playerLeftShips,
			board: board,
			visibleEnemyShips: playerRightShips
		}
	}
	//console.log("~~~~~~~~~~");
	//console.log(responseStreams)
	responseStreams[players.playerLeft].send(leftRet);
	console.log("sent left ret");
	
	var rightRet = {
		id: 'playerRight',
		gameState: {
			playerShips: playerRightShips,
			board: board,
			visibleEnemyShips: playerLeftShips
		}
	}
	responseStreams[players.playerRight].send(rightRet);
	console.log("sent right ret")
	t = setTimeout(update, 10000)
}

var executeOrders = function (leftOrders, rightOrders) {
	console.log("executing orders")
	console.log(leftOrders);
	console.log(rightOrders);
	var leftMovement = leftOrders.orders.filter(function (n) {return n.action == 'move'})
	var rightMovement = rightOrders.orders.filter(function (n) {return n.action == 'move'})
	executeMovement(leftMovement, rightMovement);
	console.log("executed executeMovement");
	//executeFiring(leftOrders, rightOrders) <- will be done after moves works...
}

//ignores collision for now, so don't let ships collide!
var executeMovement = function (leftOrders, rightOrders) {
	console.log('executing movement phase');
	var allDest = {};
	for (i in leftOrders) {
		var order = leftOrders[i];
		var dist = order.actArgs.distance;
		var shipId = order.shipName;
		playerLeftShips[shipId].move(dist);
		//moveShip(players.playerLeft, shipId, dist);
	}


	for (i in rightOrders) {
		var order = leftOrders[i];
		var dist = order.actArgs.distance;
		var shipId = order.shipName;
		playerRightShips[shipId].move(dist);
		//moveShip(players.playerRight, shipId, dist)
	}

	console.log("updating board");
	//UPDATE BOARD HERE
	for (i in playerLeftShips) {
		var ship = playerLeftShips[i];
		var newXPos = ship.position.x
		var newYPos = ship.position.y
		var oldXPos = ship.lastPosition.x
		var oldYPos = ship.lastPosition.y
		board[oldXPos][oldYPos] = new logic.Space(oldXPos,oldYPos);
		board[newXPos][newYPos] = ship
	}

	for (i in playerRightShips) {
		var ship = playerRightShips[i];
		var newXPos = ship.position.x
		var newYPos = ship.position.y
		var oldXPos = ship.lastPosition.x
		var oldYPos = ship.lastPosition.y
		board[oldXPos][oldYPos] = new logic.Space(oldXPos,oldYPos);
		board[newXPos][newYPos] = ship
	}


	console.log('done moving all players');
}

/*

var moveShip = function (player, shipId, distance) {
	var playerShips = null;
	if (player == players.playerLeft) {
		playerShips = playerLeftShips;
	} else {
		playerShips = playerRightShips;
	}
	for (i in playerShips) {
		var ship = playerShips[i];
		if (ship.shipId == shipId) {
			console.log("this is the ship");
			ship.lastPosition = ship.position;
			var xPos = ship.position.x;
			var yPos = ship.position.y;
			var distance = parseInt(distance)

			if (ship.facing == "up") {
				ship.position = {x: xPos, y: yPos + distance}
			} else if (ship.facing == "right") {
				ship.position = {x: xPos + distance, y: yPos}
			} else if (ship.facing == "left") {
				ship.position = {x: xPos - distance, y: yPos}
			} else if (ship.facing == "down") {
				ship.position = {x: xPos, y: yPos - distance}
			} else {
				console.log("wat");
			}

			var oldPos = ship.lastPosition;
			var oldX = oldPos.x;
			var oldY = oldPos.y;
			var newPos = ship.position;
			var newX = newPos.x;
			var newY = newPos.y;

			if (newX < 0 || newX > maxX || newY < 0 || newY > maxY) {
				ship.position = ship.lastPosition
				newX = ship.position.x;
				newY = ship.position.y;
			}

			console.log("X: "+ship.position.x);
			console.log("Y: "+ship.position.y);

			board[oldX][oldY] = createSpace(oldX,oldY);
			board[newX][newY] = createShip(shipId,newX,newY,ship.facing);

		} else {
			console.log("not the ship");
		}
	}
}
*/

var createShip = function (id, x, y, facing) {
	var ret = {
		shipId: id, 
		position: {x: x, y: y}, 
		type: 'Ship',
		facing: facing,
		lastPosition: null
	}
	return ret
}

var createSpace = function (x,y) {
	var ret = {
		shipId: null,
		position: {
			x: x,
			y: y
		},
		type: "Space"
	}
	return ret
}


//function called at the very beginning to create a board
var playerLeftShips = null;
var playerRightShips = null;
var board = null;
var maxX = 9;
var maxY = 9;

var players = {
	playerLeft: null,
	playerRight: null
}

var leftOrderQueue = [];
var rightOrderQueue = [];

var initialize = function () {

	board = new Array(maxX+1);

	for (var i = 0; i <= maxX; i++) {
		board[i] = new Array(maxX+1);
	}

	for (var i = 0; i <= maxX; i++) {
		for (var j = 0; j <= maxY; j++) {
			board[i][j] = new logic.Space(i,j);
		}
	}

	var leftShip1 = new logic.Ship(0,0,0, 'right');
	var leftShip2 = new logic.Ship(1,0,1, 'right');

	//actually JSON with IDs.
	playerLeftShips = {0: leftShip1, 1: leftShip2};

	var rightShip1 = new logic.Ship(0,9,9, 'left');
	var rightShip2 = new logic.Ship(1,9,8, 'left');

	playerRightShips = {0: rightShip1, 1: rightShip2};

	board[0][0] = leftShip1;
	board[0][1] = leftShip2;

	board[9][9] = rightShip1;
	board[9][8] = rightShip2;
}

console.log("pre-initialize");
initialize();
console.log("initialized");
//console.log(playerLeftShips)
//console.log("testing module :)");
//fyi: the new keyword is very important :)
//var foo = new logic.Ship(5,5,5,"up");

server.listen(80);
console.log("Express server started")