const compose = require('koa-compose')
const WebSocket = require('../../ws')
const http = require('http')
const createContext = require('./context')
// const Hub = require('../../pubsub')

const DEFAULT_STATUS_CODE = 1005

function _finishUpgradeHandling(ctx) {

}

function _finishMessageHandling(ctx) {
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
      // default
      verifyClient: null,
      handleProtocols: () => null,
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
      .on('upgrade', async (req, res, head) => {
        const ctx = await this.handleUpgrade(req, res, head)

        _finishUpgradeHandling(ctx)

        wsServer.completeUpgrade(req, res, head)
      })
      .on('connection', websocket => {
        websocket
          .on('message', message => {
            this
              .handleMessage(message, websocket)
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

  async handleUpgrade(request, response) {
    const ctx = createContext({
      _: {
        request,
        response
      }
    })

    await this._composedConnectionMiddleware(ctx)

    return ctx
  }

  handleMessage(message, websocket, request) {
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
    return (request, socket, head) => {
      this._wss.handleUpgrade(request, socket, head)
    }
  }

  listen() {}
}

module.exports = Ws
