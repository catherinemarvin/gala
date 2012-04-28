import command

fleet = command.Fleet(['Foo', 'Bar'])


foo = fleet.getShip('Foo')
bar = fleet.getShip('Bar')
print foo.__dict__

while(True):
 enemyShips = fleet.state.visibleEnemyShips
 target1 = None
 target2 = None
 if (len(enemyShips) > 1):
   target1 = enemyShips[0]
   target2 = enemyShips[1]
 elif(len(enemyShips) > 0):
   target2 = enemyShips[0]
 def shipAI(target, ship):
   position = target['position']
   if (position['x'] == ship.position['x']):
     if (position['y'] < ship.position['y'] and position['y'] >= ship.position['y'] - 3):
        if (ship.facing != 'up'):
          ship.turn('right')
        else:
          ship.shoot()
     elif (position['y'] > ship.position['y'] and position['y'] <= ship.position['y'] + 3):
        print "in shooting range"
        if (ship.facing != 'down'):
          ship.turn('left')
        else:
          ship.shoot()
     else: 
       if (position['y'] < ship.position['y']):
         if ( ship.facing != 'up' ):
           ship.turn('right')
         else: 
           ship.move(1)
       else:
         if (ship.facing != 'down' ):
           ship.turn('left')
         else: 
           ship.move(1)
   elif (position['x'] < ship.position['x']):
      if (ship.facing != 'left'):
        ship.turn('left')
      else: 
        ship.move(1)
   else:
      if (ship.facing != 'right'):
        ship.turn('right')
      else: 
        ship.move(1)
 if(target1 != None):
   shipAI(target1, foo)
 if(target2 != None):
   shipAI(target2, bar) 
 fleet.executeOrders()     
    
