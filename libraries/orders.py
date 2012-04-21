import command

fleet = command.Fleet(['Foo', 'Bar'])


foo = fleet.getShip('Foo')

while(True):
  foo.move(1)
  fleet.executeOrders()
