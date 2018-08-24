var Hub = require('./hub')

var hub = new Hub({
  separator: '/',
  linked: false
})

hub.create('/ee')
hub.create('/ee/1')
hub.create('/ee/2')

var EventEmitter = require('events')
var one = new EventEmitter()

hub.connect('/ee', one)
hub.connect('/ee/1', one)

one.on('broadcast', (channel, date) => {
  console.log('[one]', channel, date)
})

one.emit('message', '/ee/1', 'one ok')

var two = new EventEmitter()

hub.connect('/ee', two)
hub.connect('/ee/2', two)

two.on('broadcast', (channel, date) => {
  console.log('[two]', channel, date)
})

two.emit('message', '/ee/2', 'two ok')

hub.publish('/ee', 'test')
