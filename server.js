var express = require('express');
var nowjs = require('now');
var logic = require('./gameLogic');
var scenario = require('./scenarios/classicTest')
//var scenario = require('./scenarios/aiTest')

var server = express.createServer();

console.log(process.argv)

if (process.argv[2] === "sp") {
	scenario = require("./scenarios/aiTest");
	console.log("single-player mode");
} else {
	console.log("multi-player mode")
}

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
});

server.get('/three', function (req, res) {
	res.render('three');
});

server.get('/skybox', function (req, res) {
	res.render('skybox');
});

server.post('/test', function (req, res) {
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
		t = setTimeout(update,2000)
		
	} else {
		console.log("??????????");
	}
        console.log(players.playerRight)
        if (players.playerRight === 'AI'){
           console.log("player is AI") 
           t = setTimeout(update, 2000)
        }

});


server.post('/order', function (req, res) {
	var orders = req.body;
	orders.orders = JSON.parse(orders.orders)
	var player = orders.id
      
	if (player === players.playerLeft && leftOrderQueue.length == 0) {
		leftOrderQueue.push(orders);
                console.log("order pushed")
	} else if (player === players.playerRight && rightOrderQueue.length == 0) {
		rightOrderQueue.push(orders)
	} else {
	}
        
	responseStreams[player] = res;

        if (players.playerRight === 'AI'){
          console.log("AI Order") 
          AI.updateOrders(board)
          rightOrderQueue.push(AI.orders)
        }
	//update()
	//update(player,res)
	
});

server.post("/getBoardState", function (req, res) {
	res.send(board)
});

//LONG POLLING.
//Related: make game tick every second or so so the game is actually watchable.

var update = function () {

	if (leftOrderQueue.length != 0 && rightOrderQueue.length != 0) {
	} else {
		console.log("don't have all the orders");
	}
	console.log("updating!");
	var leftOrders = leftOrderQueue.shift();
	var rightOrders = rightOrderQueue.shift();
	executeOrders(leftOrders, rightOrders);
	
	var leftRet = {
		id: 'playerLeft',
		gameState: {
			playerShips: playerLeftShips,
			board: board,
			visibleEnemyShips: playerRightShips
		}
	}
        try{   
	  responseStreams[players.playerLeft].send(leftRet);
        }
        catch(e){
        }
	console.log("sent left ret");
	
	var rightRet = {
		id: 'playerRight',
		gameState: {
			playerShips: playerRightShips,
			board: board,
			visibleEnemyShips: playerLeftShips
		}
	}
        try{
          responseStreams[players.playerRight].send(rightRet);
        }
        catch(e){
        }
	console.log("sent right ret")
	everyone.now.pushChanges();
	t = setTimeout(update,1000)
}

everyone.now.pushChanges = function () {
	everyone.now.getChanges(changes)
	changes.turns = [];
	changes.moves = [];
	changes.shots = [];
	changes.destroyed = [];
}

var executeOrders = function (leftOrders, rightOrders) {
        var destroyedShips = [] 
        if ( leftOrders == undefined){
          leftOrders = {}
          leftOrders.orders = []
        }
        if (rightOrders == undefined){
          rightOrders = {}
          rightOrders.orders = []
        }
        var shipHasExecutedOrder = {}
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

        var leftTurn = leftOrders.orders.filter(function (n) { return n.action == 'turn'})
        var rightTurn = rightOrders.orders.filter(function (n) { return n.action == 'turn'})
        
        executeTurn(leftTurn, rightTurn, allDest, allShipStartPos, shipHasExecutedOrder)
         
	var leftMovement = leftOrders.orders.filter(function (n) {return n.action == 'move'})
	var rightMovement = rightOrders.orders.filter(function (n) {return n.action == 'move'})

	executeMovement(leftMovement, rightMovement, allDest, allShipStartPos, shipHasExecutedOrder, destroyedShips);

        var leftShoot = leftOrders.orders.filter(function (n) {return n.action == 'shoot'})
        var rightShoot = rightOrders.orders.filter(function (n) {return n.action == 'shoot'})
        
        executeShooting(leftShoot, rightShoot, allDest, allShipStartPos, shipHasExecutedOrder, destroyedShips)
        for (i in changes.destroyed){
          var shipId = changes.destroyed[i].shipId
          var ship = null
          if (! (playerLeftShips[shipId] == undefined)){
             ship = playerLeftShips[shipId]
          }
          else if ( ! (playerRightShips[shipId] == undefined)){
             ship = playerRightShips[shipId]
          }
          console.log(ship)
          if ( ! (ship === null)){
            ship.destroy(board, playerLeftShips, playerRightShips, destroyedShips, 'shots')
          }
        }
}

var executeTurn = function (leftOrders, rightOrders, allDest, allShipStartPos, shipHasExecutedOrder){
  console.log('executing turning phase')
  for (i in leftOrders) {
     var order = leftOrders[i]
     var direction = order.actArgs.direction
     var shipId = order.shipName
     var ship = playerLeftShips[shipId]
     if (!(ship === undefined) && shipHasExecutedOrder[shipId] === undefined){
       shipHasExecutedOrder[shipId] = true
       ship.turn(direction)
       changes.turns.push({'ship' : ship , 'direction' : direction})
     }
  }
  for (i in rightOrders){
    console.log('RIGHT SHIP TURNING')
    var order = rightOrders[i]
    var direction = order.actArgs.direction
    var shipId = order.shipName
    var ship = playerRightShips[shipId]
    if (!(ship === undefined) && shipHasExecutedOrder[shipId] === undefined){
       shipHasExecutedOrder[shipId] = true
       ship.turn(direction)
       changes.turns.push({'ship' : ship , 'direction' : direction})
     }
  } 

}

var executeShooting = function (leftOrders, rightOrders, allDest, allShipStartPos, shipHasExecutedOrder, destroyedShips){
     for (i in leftOrders) {
       var order = leftOrders[i]
       var shipId = order.shipName
       var ship = playerLeftShips[shipId]
       var bulletDest = null
       if (!(ship === undefined) && shipHasExecutedOrder[shipId] === undefined){
          shipHasExecutedOrder[shipId] = true
          bulletDest = ship.shoot(board, playerLeftShips, playerRightShips, changes)
          changes.shots.push({'ship': ship , 'finalDest' : bulletDest})
       }
     }
     for (i in rightOrders){
       var order = rightOrders[i]
       var shipId = order.shipName
       var ship = playerRightShips[shipId]
       var bulletDest = null
       if(!(ship === undefined) && shipHasExecutedOrder[shipId] === undefined){
         shipHasExecutedOrder[shipId] = true
         bulletDest = ship.shoot(board, playerLeftShips, playerRightShips, changes)
         changes.shots.push({'ship': ship , 'finalDest' : bulletDest})
       }
     }
}

var executeMovement = function (leftOrders, rightOrders, allDest, allShipStartPos, shipHasExecutedOrder, destroyedShips) {
	console.log('executing movement phase');
	for (i in leftOrders) {
		var order = leftOrders[i];
		var dist = order.actArgs.distance;
		var shipId = order.shipName;
                var ship = playerLeftShips[shipId]
                if (!(ship === undefined) && shipHasExecutedOrder[shipId] === undefined){
                  shipHasExecutedOrder[shipId] = true
		  var hasMoved = ship.move(dist);
                  if (hasMoved){
                    changes.moves.push({'ship' : ship , 'distance': dist})
                  }
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
                if (!(ship === undefined) && shipHasExecutedOrder[shipId] === undefined){
                  shipHasExecutedOrder[shipId] = true
                  var hasMoved = ship.move(dist)
                  if (hasMoved){
                   changes.moves.push({'ship' : ship , 'distance': dist})
                  }
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
        for (i in allDest){
          if(allDest[i].length > 1){
            for (j in allDest[i]){
              var ship = allDest[i][j]
              ship.destroy(board, playerLeftShips, playerRightShips, changes, 'crashed')
            }
          }
        }

        
	console.log('done moving all players');
}


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
var changes = {}
changes.turns = []
changes.moves = []
changes.shots = []
changes.destroyed = []
var board = null;
var maxX = null;
var maxY = null;

var players = {
	playerLeft: null,
	playerRight: null
}

var leftOrderQueue = [];
var rightOrderQueue = [];
var AI = null
var initialize = function () {
        var scene = new scenario.Scenario()
        if (scene.isSinglePlayer){
          console.log("scene is single player")
          players.playerRight = 'AI'
          console.log(players.playerRight)
          AI = scene.AI
        }
        maxX = scene.maxX
        maxY = scene.maxY
        board = scene.board
        playerRightShips = scene.playerRightShips
        playerLeftShips = scene.playerLeftShips
        
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
