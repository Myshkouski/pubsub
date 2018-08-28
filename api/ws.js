const compose = require('koa-compose')
const WebSocket = require('ws')
const createContext = require('./context')
// const Hub = require('../../pubsub')

const DEFAULT_STATUS_CODE = 1005

function _finishResponse(ctx) {
  if (!ctx.handled) {
    if (ctx.statusCode !== DEFAULT_STATUS_CODE) {
      ctx.websocket.close(ctx.statusCode, ctx.status)
    }
  }
}

class Ws {
  constructor() {
    const wsServer = new WebSocket.Server({
      noServer: true,
      perMessageDeflate: {
        // See zlib defaults.
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },

        // Other options settable:
        // Defaults to negotiated value.
        // clientNoContextTakeover: true,
        // Defaults to negotiated value.
        // serverNoContextTakeover: true,
        // Defaults to negotiated value.
        // clientMaxWindowBits: 10,
        // Defaults to negotiated value.
        // serverMaxWindowBits: 10,

        // Below options specified as default values.
        // Limits zlib concurrency for perf.
        // concurrencyLimit: 10,
        // Size (in bytes) below which messages
        // should not be compressed.
        // threshold: 1024,
      }
    })

    wsServer.on('connection', (request, websocket) => {
      websocket
        .on('message', message => {
          this.handle(message, websocket, request).then(_finishResponse)
        })
        .once('close', () => {
          // hub.publish(token, {
          //   address: request.connection.remoteAddress
          // })
          // hub.unsubscribe(token)
        })
        .once('error', () => {
          // hub.publish(token, error.message)
          // hub.unsubscribe(token)
          websocket.terminate()
        })

      // const token = hub.subscribe('/connect', data => {
      //   if (websocket.readyState === WebSocket.OPEN) {
      //     websocket.send(JSON.stringify({
      //       kind: 'connect',
      //       data
      //     }))
      //   }
      // })
    })

    const middleware = []

    this._wss = wsServer
    this._middleware = middleware
    this._composed = compose(middleware)
  }

  use(middleware) {
    const _middleware = this._middleware
    _middleware.push(middleware)
    this._composed = compose(_middleware)
    return this
  }

  handle(message, websocket, request) {
    const ctx = createContext({
      _: {
        message,
        websocket,
        request,
        statusCode: DEFAULT_STATUS_CODE
      }
    })

    return this._composed(ctx).then(() => ctx)
  }

  callback() {
    const hub = this
    const wsServer = hub._wss
    return function _handleUpgrade(request, socket, head) {
      wsServer.handleUpgrade(request, socket, head, websocket => {
        wsServer.emit('connection', request, websocket)
      })
    }
  }
}

module.exports = Ws
