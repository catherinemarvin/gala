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
		t = setTimeout(update,5000)
		
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
	//console.log("GETTING BOARD STATE");
	//console.log(board)
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

        if ( leftOrders == undefined){
          leftOrders = []
        }
        if (rightOrders == undefined){
          rightOrders = []
        }
        var allShipStartPos = {}
        for (i in playerLeftShips){
          var ship = playerLeftShips[i]
          allShipStartPos[ship['shipId']] = {'shipId': ship['shipId'] , 'x' : ship.position.x , 'y': ship.position.y }
        }
        for (i in playerRightShips){
          var ship = playerRightShips[i]
          allShipStartPos[ship['shipId']] = {'shipId': ship['shipId'] , 'x' : ship.position.x , 'y': ship.position.y }
        }

        var allDest = {}
	var leftMovement = leftOrders.orders.filter(function (n) {return n.action == 'move'})
	var rightMovement = rightOrders.orders.filter(function (n) {return n.action == 'move'})
	executeMovement(leftMovement, rightMovement, allDest, allShipStartPos);
	console.log("executed executeMovement");
	//executeFiring(leftOrders, rightOrders) <- will be done after moves works...
}

var executeMovement = function (leftOrders, rightOrders, allDest, allShipStartPos) {
	console.log('executing movement phase');
	for (i in leftOrders) {
		var order = leftOrders[i];
		var dist = order.actArgs.distance;
		var shipId = order.shipName;
                var ship = playerLeftShips[shipId]
                if (!(ship === undefined)){
                  console.log('should only happen once') 
		  ship.move(dist);
                  var newXPos = ship.position.x
                  var newYPos = ship.position.y
                  var oldXPos = ship.lastPosition.x
                  var oldYPos = ship.lastPosition.y
                  board[oldXPos][oldYPos] = new logic.Space(oldXPos,oldYPos);
                  board[newXPos][newYPos] = ship
                  if ( allDest[ [newXPos , newYPos] ] == undefined){
                     allDest[[newXPos, newYPos]] = [ship]
                  }
                  else{
                    allDest[[newXPos, newYPos]].push(ship)
                  }
                  delete allShipStartPos[shipId]
               }
	}


	for (i in rightOrders) {
		var order = rightOrders[i];
		var dist = order.actArgs.distance;
		var shipId = order.shipName;
		var ship = playerRightShips[shipId]
                if (!(ship === undefined)){
                  console.log('happens alla time')
                  ship.move(dist)
                  var newXPos = ship.position.x
                  var newYPos = ship.position.y
                  var oldXPos = ship.lastPosition.x
                  var oldYPos = ship.lastPosition.y
                  board[oldXPos][oldYPos] = new logic.Space(oldXPos,oldYPos);
                  board[newXPos][newYPos] = ship
                  if ( allDest[ [newXPos , newYPos] ] == undefined){
                     allDest[[newXPos, newYPos]] = [ship]
                  }
                  else{
                     allDest[[newXPos, newYPos]].push(ship)
                  }
                  delete allShipStartPos[shipId]
               }
	}
        console.log("ALLDEST BEFORE STATIONARY SHIPS")
        console.log(allDest)
        console.log("STATIONARY SHIPS")
        console.log(allShipStartPos)

        for (i in allShipStartPos){
          var shipId = allShipStartPos[i]['shipId']
          var ship = null
          if (!(playerLeftShips[shipId] == undefined)){
             ship = playerLeftShips[shipId]
          }
          else{
             ship = playerRightShips[shipId]
          }
          var xPos = allShipStartPos[i]['x']
          var yPos = allShipStartPos[i]['y']
          if ( allDest[ [xPos , yPos] ] == undefined){
            allDest[[xPos, yPos]] = [ship]
          }
          else{
            allDest[[xPos, yPos]].push(ship)
          }

        }
        console.log("HERES ALLDEST!!!!!!!!!!!!!!!!!!!!!")
        console.log( allDest )
        for (i in allDest){
          if(allDest[i].length > 1){
            for (j in allDest[i]){
              console.log('ship destroyed~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
              var ship = allDest[i][j]
              console.log(ship)
              if (ship.fleet === 'playerLeftShips'){
                console.log('left ship should be destroyed???????????????????????????')
                ship.destroy(board, playerLeftShips)
              }
              else if (ship.fleet === 'playerRightShips'){
                console.log('right ship destroyed ???????????????????????????????????')
                ship.destroy(board, playerRightShips)
              }

            }
          }
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

	var leftShip1 = new logic.Ship(0,0,0, 'right', 'playerLeft', "playerLeftShips");
	var leftShip2 = new logic.Ship(1,1,0, 'left', 'playerLeft', "playerLeftShips");

	//actually JSON with IDs.
	playerLeftShips = {0: leftShip1, 1: leftShip2};

	var rightShip1 = new logic.Ship(2,9,9, 'left', 'playerRight', "playerRightShips");
	var rightShip2 = new logic.Ship(3,9,8, 'left', 'playerRight', "playerRightShips");

	playerRightShips = {2: rightShip1, 3: rightShip2};

	board[0][0] = leftShip1;
	board[1][0] = leftShip2;

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
