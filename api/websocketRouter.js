const pathToRegexp = require('path-to-regexp')
const Hub = require('../../pubsub')

class Layer {
  constructor() {
    this._hub = new Hub({
      separator: '/'
    })

    this._middleware = {}
  }

  use() {
    let path = '*'
    let middleware = arguments[0]

    if(1 in arguments) {
      path = middleware
      middleware = arguments[1]
    }

    const re = pathToRegexp(path)
    const hub = this._hub
    // hub.create(re.toString())

    console.log(hub)
  }

  handle(message, websocket, request) {
    message = JSON.parse(message)
    const type = message.type


  }
}

class WebsocketRouter {
  constructor() {

  }

  use() {}
}

const router = new WebsocketRouter()
const layer = new Layer()

layer.use('/test/1', async ctx => {

})

router.use('/channel/name', async ctx => {})

module.exports = WebsocketRouter
