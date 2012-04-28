import command

fleet = command.Fleet(['Foo', 'Bar'])


foo = fleet.getShip('Foo')
bar = fleet.getShip('Bar')
print foo.__dict__

while(True):
   enemyShips = fleet.state.visibleEnemyShips
   target = enemyShips[0]
   position = target['position']
   if (position['x'] == foo.position['x']):
     print "foo's position"
     print foo.position
     print position
     if (position['y'] < foo.position['y'] and position['y'] >= foo.position['y'] - 3):
        if (foo.facing != 'up'):
          foo.turn('right')
        else:
          foo.shoot()
        fleet.executeOrders()
     elif (position['y'] > foo.position['y'] and position['y'] <= foo.position['y'] + 3):
        print "in shooting range"
        if (foo.facing != 'down'):
          foo.turn('left')
        else:
          foo.shoot()
        fleet.executeOrders()
     else: 
       if (position['y'] < foo.position['y']):
         if ( foo.facing != 'up' ):
           foo.turn('right')
         else: 
           foo.move(1)
         fleet.executeOrders()   
       else:
         if (foo.facing != 'down' ):
           foo.turn('left')
         else: 
           foo.move(1)
         fleet.executeOrders()
   elif (position['x'] < foo.position['x']):
      if (foo.facing != 'left'):
        foo.turn('left')
      else: 
        foo.move(1)
      fleet.executeOrders()
   else:
      if (foo.facing != 'right'):
        foo.turn('right')
      else: 
        foo.move(1)
      fleet.executeOrders()
       
    
