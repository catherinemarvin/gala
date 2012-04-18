import urllib2
import json

class __ServerUpdate:
  def __init__(self, id):
    self.serverUpdate = {'id': id, 'orders': []} 
  def send(self):
    jsonUpdate = json.dumps(self.serverUpdate)
    response = urllib2.urlopen(updateUrl)
    return json.loads(response.read())
  def reset(self):
    self.serverUpdate['orders'] = []

class __GameState:
  pass #statistics for my ships. info about all squares I can see. info about all enemy ships I can see

class Fleet:
  def __init__(self, names):
    response = urllib2.urlopen(serverUrl)
    infoJson = json.loads(response.read())
    self.playerId = infoJson['id']
    self.ships = {}
    i = 0
    for shipJson in infoJson['ships']: #infoJson['ships'] is a list of dictionaries
      buildShip = globals()[shipJson['type']]
      self.ships[names[i]] = buildShip(shipJson, names[i])
      i = i + 1
    self.__updatetoServer = __ServerUpdate(self.playerID)
    self.state = __GameState(infoJson['state'])

  def __modifyUpdateObject(self, shipName, actionName, actionArgs):
    self.serverUpdate['orders'].append({'shipName': shipName, 'action': actionName, 'actArgs': actionArgs})

  def executeOrders(self):
    gameState = self.__updatetoServer.send()
    self.state = __GameState(gameState)
    self.__updatetoServer.reset()
  
  def getInfo():
    return self.state

class Ship(Fleet):
  def __init__(self, shipJson, name):  
    self.name = name
    self.id = shipJson['id']

  def move(self, distance):
    Fleet.__modifyUpdateObject(self.name, 'move', {'distance': distance})

  def turn(self, relativeTurn):
    Fleet.__modifyUpdateObject(self.name, 'turn', {'direction': relativeTurn})

  def shoot(self):
    Fleet.__modifyUpdateObject(self.name, 'shoot') 



def endTurn():
  pass

def __modifyUpdateObject(shipName, actionName, actionArgs ):
  pass


