//ship logic

//ideally: set up some sort of export where we can acquire board features within gameLogic, but that is too much work. :3


var Ship = function (id, x, y, facing, playerId, fleet, maxX, maxY) {
	this.shipId = id;
	this.position = {x : x, y : y};
	this.type = 'Ship';
	this.facing = facing;
	this.lastPosition = {x : x, y : y};
        this.playerId = playerId
        this.fleet = fleet
        this.health = 2
        this.damage = 1
        this.range = 3
        this.maxX = maxX
        this.maxY = maxY
	return this
}
Ship.prototype.turn = function (direction) {
        if (this.facing == "up") {
                if (direction == "left"){
                    this.facing = "left"
                }
                else if (direction == "right"){
                    this.facing = "right"
                }
                else if (direction == "flip"){
                    this.facing = "down"
                }
        } 
        else if (this.facing == "right") {
                if (direction == "left"){
                    this.facing = "up"
                }
                else if (direction == "right"){
                    this.facing = "down"
                }
                else if (direction == "flip"){
                    this.facing = "left"
                }
        } 
        else if (this.facing == "left") {
               if (direction == "left"){
                    this.facing = "down"
                }
                else if (direction == "right"){
                    this.facing = "up"
                }
                else if (direction == "flip"){
                    this.facing = "right"
                }
        } 
        else if (this.facing == "down") {
               if (direction == "left"){
                    this.facing = "right"
                }
                else if (direction == "right"){
                    this.facing = "left"
                }
                else if (direction == "flip"){
                    this.facing = "up"
                }
        } 
        else {
                console.log("wat");
        }
}
Ship.prototype.move = function (distance) {
	console.log("moving ship")
        var maxX = this.maxX
        var maxY = this.maxY
        var hasMoved = true
	this.lastPosition = this.position;
	var xPos = this.position.x;
	var yPos = this.position.y;

	if (this.facing == "up") {
		this.position = {x: xPos, y: yPos - distance}
	} else if (this.facing == "right") {
		this.position = {x: xPos + distance, y: yPos}
	} else if (this.facing == "left") {
		this.position = {x: xPos - distance, y: yPos}
	} else if (this.facing == "down") {
		this.position = {x: xPos, y: yPos + distance}
	} else {
		console.log("wat");
	}

	var oldPos = this.lastPosition;
	var oldX = oldPos.x;
	var oldY = oldPos.y;
	var newPos = this.position;
	var newX = newPos.x;
	var newY = newPos.y;

	if (newX < 0 || newX > maxX || newY < 0 || newY > maxY) {
				this.position = this.lastPosition
				newX = this.position.x;
				newY = this.position.y;
                                hasMoved = false
			}

	console.log("X: "+this.position.x);
	console.log("Y: "+this.position.y);
	return hasMoved
}

Ship.prototype.takeDamage = function(gameBoard, playerLeftShips, playerRightShips, destroyedShips, damage){
  this.health = this.health - damage
  if (this.health <= 0){
    console.log('~~~~~~~~~~~~~~~~~~~~~DESTROYING~~~~~~~~~~~~~~~~~~~~~~')
    this.destroy(gameBoard, playerLeftShips, playerRightShips, destroyedShips, 'shots')
  }
}

Ship.prototype.shoot = function(gameBoard, playerLeftShips, playerRightShips, destroyedShips){
  var maxX = this.maxX
  var maxY = this.maxY
  var xPos = this.position.x
  var yPos = this.position.y
  var bulletDest = {}
  if (this.facing == "up"){
     for (var i = yPos - 1 ; i < this.range ; i = i - 1){
        if (i >= 0){ //grid boundaries
           if (gameBoard[xPos][i] instanceof Ship){
             ship = gameBoard[xPos][i]
             ship.takeDamage(gameBoard, playerLeftShips, playerRightShips, destroyedShips, this.damage)
             bulletDest.x = xPos
             bulletDest.y = i
             break
           }
        }
        else{
           bulletDest.x = xPos
           bulletDest.y = 0
           break
        }      
     }    
     if (bulletDest.x == null){
       bulletDest.x = xPos
       bulletDest.y = yPos - this.range
     }
  }
  if (this.facing == "right"){
     for (var i = xPos + 1 ; i < this.range ; i = i + 1){
        if (i <= maxX ){ //grid boundaries
           if (gameBoard[i][yPos] instanceof Ship){
             ship = gameBoard[i][yPos]
             ship.takeDamage(gameBoard, playerLeftShips, playerRightShips, destroyedShips, this.damage)
             bulletDest.x = i
             bulletDest.y = yPos
             break
           }
        }
        else{
          bulletDest.x = maxX
          bulletDest.y = yPos
          break
        }
     }
     if (bulletDest.x == null){
       bulletDest.x = xPos + this.range
       bulletDest.y = yPos 
     }
     
  }
  if (this.facing == "left"){
     for (var i = xPos - 1 ; i < this.range ; i = i - 1){
        if(i >= 0){
           if (gameBoard[i][yPos] instanceof Ship){
             ship = gameBoard[i][yPos]
             ship.takeDamage(gameBoard, playerLeftShips, playerRightShips, destroyedShips, this.damage)
             bulletDest.x = i
             bulletDest.y = yPos
             break
           }
        }
        else{
          bulletDest.x = 0
          bulletDest.y = yPos
          break
        } 
     }
     if (bulletDest.x == null){
       bulletDest.x = xPos - this.range
       bulletDest.y = yPos
     }
  }
  if (this.facing == "down"){
    for (var i = yPos+1 ; i < this.range ; i = i +1){
        if (i <= maxY){
          if (gameBoard[xPos][i] instanceof Ship){
             ship = gameBoard[xPos][i]
             ship.takeDamage(gameBoard, playerLeftShips, playerRightShips, destroyedShips, this.damage)
             bulletDest.x = xPos
             bulletDest.y = i
             break
          }
        }
        else{
          bulletDest.x = xPos
          bulletDest.y = maxY
          break
        }
    }
    if (bulletDest.x == null){
       bulletDest.x = xPos
       bulletDest.y = yPos + this.range
    }
  }  

  return bulletDest

}

Ship.prototype.destroy = function (gameBoard, playerLeftShips, playerRightShips, changes, manner){
        if (this.fleet === 'playerLeftShips'){
           delete playerLeftShips[this.shipId]
        }
        else if(this.fleet === 'playerRightShips'){
           delete playerRightShips[this.shipId]
        }
      
        changes.destroyed.push({'shipId': this.shipId, 'manner': manner})
        
        gameBoard[this.position.x][this.position.y] = new Space(this.position.x,this.position.y); 
}


var Space = function (x,y) {
	this.shipId = null;
	this.position = {x: x, y: y};
	this.type = "Space"
        this.bounced = false
	return this
}

module.exports.Ship = Ship
module.exports.Space = Space
