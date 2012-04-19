//ship logic
var Ship = function (id, x, y, facing) {
	this.shipId = id;
	this.position = {x : x, y : y};
	this.type = 'Ship';
	this.facing = facing;
	this.lastPosition = null;
	return this
}

Ship.prototype.test = function () {
	console.log("TEST TEST TEST");
}

module.exports.Ship = Ship