import urllib2
import urllib
import json

serverUrl = "http://0.0.0.0/start"
updateUrl = "http://0.0.0.0/order"

class ServerUpdate:
  def __init__(self, shipId):
    self.serverUpdate = {'id': shipId, 'orders': []}
  def addOrder(self, shipId, actionName, actionArgs):
    self.serverUpdate['orders'].append({'shipName': shipId, 'action': actionName, 'actArgs': actionArgs})
  def send(self): #fix by making a post request
    
    toPost = { 'id': self.serverUpdate['id'], 'orders': json.dumps(self.serverUpdate['orders']) }
    
    toPost = urllib.urlencode(toPost)
    req = urllib2.Request(updateUrl, toPost)
    response = urllib2.urlopen(req)

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
    toPost = urllib.urlencode({})
    req = urllib2.Request(serverUrl, toPost)
    response = urllib2.urlopen(req)
    infoJson = json.loads(response.read())
    #infoJson = j
    self.playerId = infoJson['id']
    self.state = GameState(infoJson['gameState'])
    self.ships = {}
    self.shipNames = {}
    i = 0
    for shipJson in self.state.playerShips: #infoJson['ships'] is a list of dictionaries
      buildShip = globals()[shipJson['type']]
      self.ships[names[i]] = buildShip(shipJson, names[i], self)
      self.shipNames[shipJson['shipId']] = names[i]
      i = i + 1
    self.updatetoServer = ServerUpdate(self.playerId)

  def updateShipStats(self):
    for shipJson in self.state.playerShips:
      self.ships[self.shipNames[shipJson['shipId']]].update(shipJson)

  def modifyUpdateObject(self, shipId, actionName, actionArgs):
    self.updatetoServer.addOrder(shipId, actionName, actionArgs)

  def executeOrders(self):
    responseDict = self.updatetoServer.send()
    self.state = GameState(responseDict['gameState'])
    self.updateShipStats()
    self.updatetoServer.reset()
  
  def getInfo(self):
    return self.state

  def getShip(self,shipName):
    return self.ships[shipName]



class Ship():
  def __init__(self, shipJson, name, fleet):
    self.fleet = fleet
    self.name = name
    for key in shipJson:
      print key
      self.__dict__[key] = shipJson[key]

  def move(self, distance):
    self.fleet.modifyUpdateObject(self.shipId, 'move', {'distance': distance})

  def turn(self, relativeTurn):
    self.fleet.modifyUpdateObject(self.shipId, 'turn', {'direction': relativeTurn})

  def shoot(self):
    self.fleet.modifyUpdateObject(self.shipId, 'shoot') 

  def update(self, shipJson):
    for key in shipJson:
      self.__dict__[key] = shipJson[key]

  def getFeature(self, featureName):
    return self.__dict__(featureName)


