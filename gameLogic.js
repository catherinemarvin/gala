//ship logic

//ideally: set up some sort of export where we can acquire board features within gameLogic, but that is too much work. :3

var maxX = 9;
var maxY = 9;

var Ship = function (id, x, y, facing) {
	this.shipId = id;
	this.position = {x : x, y : y};
	this.type = 'Ship';
	this.facing = facing;
	this.lastPosition = {x : x, y : y};
	return this
}

Ship.prototype.move = function (distance) {
	console.log("moving ship")
	this.lastPosition = this.position;
	var xPos = this.position.x;
	var yPos = this.position.y;

	if (this.facing == "up") {
		this.position = {x: xPox, y: yPox + distance}
	} else if (this.facing == "right") {
		this.position = {x: xPos + distance, y: yPos}
	} else if (this.facing == "left") {
		this.position = {x: xPos - distance, y: yPos}
	} else if (this.facing == "down") {
		this.position = {x: xPos, y: yPos - distance}
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
			}

	console.log("X: "+this.position.x);
	console.log("Y: "+this.position.y);
	return this;
}

var Space = function (x,y) {
	this.shipId = null;
	this.position = {x: x, y: y};
	this.type = "Space"
	return this
}

module.exports.Ship = Ship
module.exports.Space = Space