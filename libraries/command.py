import urllib2
import json

class __ServerUpdate:
  def __init__(self, id):
    self.serverUpdate = {'id': id, 'orders': []}
  def addOrder(self, shipId, actionName, actionArgs):
    self.serverUpdate['orders'].append({'shipName': shipId, 'action': actionName, 'actArgs': actionArgs})
     
  def send(self):
    jsonUpdate = json.dumps(self.serverUpdate)
    response = urllib2.urlopen(updateUrl)
    return json.loads(response.read())
  def reset(self):
    self.serverUpdate['orders'] = []

class __GameState:
  def __init__(self, gameStateJson):
    self.playerShips = gameStateJson['playerShips']
    self.board = gameStateJson['board']
    self.visibleEnemyShips = gameStateJson['visibleEnemyShips']

class Fleet:
  def __init__(self, names):
    response = urllib2.urlopen(serverUrl)
    infoJson = json.loads(response.read())
    self.playerId = infoJson['id']
    self.state = __GameState(infoJson['gameState'])
    self.ships = {}
    self.__shipNames = {}
    i = 0
    for shipJson in self.state.playerShips: #infoJson['ships'] is a list of dictionaries
      buildShip = globals()[shipJson['type']]
      self.ships[names[i]] = buildShip(shipJson, names[i])
      i = i + 1
    self.__updatetoServer = __ServerUpdate(self.playerID)

  def updateShipStats():
    for shipJson in self.state.playerShips:
      self.ships[self.__shipNames[shipJson['id']]].update(shipJson)

  def __modifyUpdateObject(self, shipId, actionName, actionArgs):
    self.__updatetoServer['orders'].addOrder(shipId, actionName, actionArgs)

  def executeOrders(self):
    gameState = self.__updatetoServer.send()
    self.state = __GameState(gameState)
    self.updateShipStats()
    self.__updatetoServer.reset()
  
  def getInfo():
    return self.state

  def getShip(shipName):
    return self.playerShips['shipName']



class Ship(Fleet):
  def __init__(self, shipJson, name, health = 10):  
    Fleet.__shipNames[id] = name
    self.name = name
    self.id = shipJson['id']
    self.health = health

  def move(self, distance):
    Fleet.__modifyUpdateObject(self.id, 'move', {'distance': distance})

  def turn(self, relativeTurn):
    Fleet.__modifyUpdateObject(self.id, 'turn', {'direction': relativeTurn})

  def shoot(self):
    Fleet.__modifyUpdateObject(self.id, 'shoot') 

  def __update(self, shipJson):
    self.health = health #don't bother trying to cheat, it's only important serverside anyways.

def endTurn():
  pass

def __modifyUpdateObject(shipName, actionName, actionArgs ):
  pass


