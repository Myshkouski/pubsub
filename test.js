var Hub = require('./hub')

var hub = new Hub({
  separator: '/',
  linked: true
})

hub.create('/test')
hub.create('/test/other')

var EventEmitter = require('events')
var one = new EventEmitter()

const test1 = hub.subscribe('/test', message => {
  console.log('test1', message)
})

const test2 = hub.subscribe('/test', message => {
  console.log('test2', message)
})

const test3 = hub.subscribe('/test', message => {
  console.log('test3', message)
})

const otherTest1 = hub.subscribe('/test/other', message => {
  console.log('otherTest1', message)
})

const otherTest2 = hub.subscribe('/test/other', message => {
  console.log('otherTest2', message)
})

const otherTest3 = hub.subscribe('/test/other', message => {
  console.log('otherTest3', message)
})

hub.broadcast(test3, 'message')
