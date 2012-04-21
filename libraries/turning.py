import command

fleet = command.Fleet(['Foo', 'Bar'])


foo = fleet.getShip('Foo')

while(True):
  foo.move(1)
  print fleet.updatetoServer.serverUpdate
  fleet.executeOrders()
  foo.turn('right')
  fleet.executeOrders()
