const compose = require('koa-compose')
const WebSocket = require('ws')
const http = require('http')
const createContext = require('./context')
// const Hub = require('../../pubsub')

const DEFAULT_STATUS_CODE = 1005

function _finsishConnection(ctx) {

}

function _finishMessageHandling() {
  if (ctx.statusCode !== DEFAULT_STATUS_CODE) {
    ctx.websocket.close(ctx.statusCode, ctx.status)
  }
}

class Ws {
  constructor() {
    const middleware = []
    this._middleware = middleware
    this._composed = compose(middleware)

    const connectionMiddleware = []
    this._connectionMiddleware = connectionMiddleware
    this._composedConnectionMiddleware = compose(connectionMiddleware)

    const wsServer = new WebSocket.Server({
      noServer: true,
      verifyClient: async (info, cb) => {
        const statusCode = 403
        const ctx = createContext({
          _: {
            request: info.req
          },
          origin: info.origin,
          statusCode,
          status: http.STATUS_CODES[statusCode]
        })

        await this._composedConnectionMiddleware(ctx)

        if(ctx.statusCode < 400) {
          cb(true)
        } else {
          cb(false, ctx.statusCode, ctx.status, ctx.headers)
        }
      },
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
        clientMaxWindowBits: 10,
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

    wsServer
      .on('connection', (request, websocket) => {
        this
          .handleConnection(request, websocket)
          // .then(_finsish)

        websocket
          .on('message', message => {
            this
              .handle(message, websocket, request)
              .then(_finishMessageHandling)
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

    this._wss = wsServer
  }

  use(middleware) {
    const _middleware = this._middleware
    _middleware.push(middleware)
    this._composed = compose(_middleware)
    return this
  }

  req(middleware) {
    const connectionMiddleware = this._connectionMiddleware
    connectionMiddleware.push(middleware)
    this._composedConnectionMiddleware = compose(connectionMiddleware)
    return this
  }

  async handleConnection(request, websocket) {
    const ctx = createContext({
      _: {
        request,
        websocket
      }
    })

    await this._composedConnectionMiddleware(ctx)

    return ctx
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
      const response = new http.ServerResponse(request)
      response.socket = socket
      response.statusCode = 502
      response.setHeader('connection', 'close')
      response.setHeader('content-length', 0)
      console.log(response.getHeaders())
      response.end()
      console.log(response)
      // wsServer.handleUpgrade(request, socket, head, websocket => {
      //   wsServer.emit('connection', request, websocket)
      // })
    }
  }

  listen() {}
}

module.exports = Ws
