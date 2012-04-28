var logic = require('../gameLogic');

var Scenario = function () {
  this.maxX = 9
  this.maxY = 9
  this.board = new Array(this.maxX+1);
  this.isSinglePlayer = false
  for (var i = 0; i <= this.maxX; i++) {
      this.board[i] = new Array(this.maxX+1);
  }
  for (var i = 0; i <= this.maxX; i++) {
     for (var j = 0; j <= this.maxY; j++) {
          this.board[i][j] = new logic.Space(i,j);
     }
  }

  var leftShip1 = new logic.Ship(0,0,0, 'right', 'playerLeft', "playerLeftShips", this.maxX, this.maxY);
  var leftShip2 = new logic.Ship(1,1,0, 'right', 'playerLeft', "playerLeftShips", this.maxX , this.maxY);


  this.playerLeftShips = {0: leftShip1, 1: leftShip2};

  var rightShip1 = new logic.Ship(2,9,9, 'left', 'playerRight', "playerRightShips");
  var rightShip2 = new logic.Ship(3,9,8, 'left', 'playerRight', "playerRightShips");

  this.playerRightShips = {2: rightShip1, 3: rightShip2};

  this.board[0][0] = leftShip1;
  this.board[1][0] = leftShip2;
  this.board[9][9] = rightShip1;
  this.board[9][8] = rightShip2;

  return this;
}

module.exports.Scenario = Scenario
