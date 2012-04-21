import command

fleet = command.Fleet(['Foo', 'Bar'])

while(True):
  foo = fleet.getShip('Foo')
  foo.shoot()
  fleet.executeOrders()
  foo.shoot()
  fleet.executeOrders()
  foo.move(1)
