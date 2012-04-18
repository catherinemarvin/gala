import urllib2
import json

serverUrl = ""

class ServerUpdate():
  def __init__(self, id):
    self.serverUpdate = {'id': id, 'orders': []}
  def addOrder(self, shipId, actionName, actionArgs):
    self.serverUpdate['orders'].append({'shipName': shipId, 'action': actionName, 'actArgs': actionArgs})
  def send(self): #fix by making a post request
    jsonUpdate = json.dumps(self.serverUpdate)
    response = urllib2.urlopen(updateUrl)
    return json.loads(response.read())
  def reset(self):
    self.serverUpdate['orders'] = []

class GameState:
  def __init__(self, gameStateJson):
    self.playerShips = gameStateJson['playerShips']
    self.board = gameStateJson['board']
    self.visibleEnemyShips = gameStateJson['visibleEnemyShips']

class Fleet:
  def __init__(self, names):
    response = urllib2.urlopen(serverUrl)
    infoJson = json.loads(response.read())
    #infoJson = j
    self.playerId = infoJson['id']
    self.state = GameState(infoJson['gameState'])
    self.ships = {}
    self.shipNames = {}
    i = 0
    for shipJson in self.state.playerShips: #infoJson['ships'] is a list of dictionaries
      buildShip = globals()[shipJson['type']]
      self.ships[names[i]] = buildShip(shipJson, names[i])
      self.shipNames[shipJson['shipId']] = names[i]
      i = i + 1
    self.updatetoServer = ServerUpdate(self.playerId)

  def updateShipStats():
    for shipJson in self.state.playerShips:
      self.ships[self.shipNames[shipJson['id']]].update(shipJson)

  def modifyUpdateObject(self, shipId, actionName, actionArgs):
    self.updatetoServer['orders'].addOrder(shipId, actionName, actionArgs)

  def executeOrders(self):
    gameState = self.updatetoServer.send()
    self.state = GameState(gameState)
    self.updateShipStats()
    self.updatetoServer.reset()
  
  def getInfo(self):
    return self.state

  def getShip(self,shipName):
    return self.ships[shipName]



class Ship(Fleet):
  def __init__(self,shipJson, name):  
    self.name = name
    for key in shipJson:
      print key
      self.__dict__[key] = shipJson[key]

  def move(self, distance):
    Fleet.modifyUpdateObject(self.id, 'move', {'distance': distance})

  def turn(self, relativeTurn):
    Fleet.modifyUpdateObject(self.id, 'turn', {'direction': relativeTurn})

  def shoot(self):
    Fleet.modifyUpdateObject(self.id, 'shoot') 

  def update(self, shipJson):
    self.__dict__[key] = shipJson[key]

  def getFeature(self, featureName):
    return self.__dict__(featureName)


