import command

fleet = command.Fleet(['Foo'])

while(True):
  foo = fleet.getShip('Foo')
  foo.move(1)
  fleet.executeOrders()

