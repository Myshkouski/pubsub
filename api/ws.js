const compose = require('koa-compose')
const WebSocket = require('ws')
const http = require('http')
const createContext = require('./context')
// const Hub = require('../../pubsub')

const DEFAULT_STATUS_CODE = 1005

function _finishUpgradeHandling(ctx) {
  return ctx
}

function _finishMessageHandling(ctx) {
  // if (ctx.statusCode === DEFAULT_STATUS_CODE) {
  //   ctx.websocket.close(ctx.statusCode, ctx.status)
  // }

  return ctx
}

class Ws {
  constructor() {
    const upgradeMiddleware = []
    this._connectionMiddleware = upgradeMiddleware
    this._composedUpgradeMiddleware = compose(upgradeMiddleware)

    const messageMiddleware = []
    this._messageMiddleware = messageMiddleware
    this._composedMessageMiddleware = compose(messageMiddleware)

    const wsServer = new WebSocket.Server({
      noServer: true,
      // default
      verifyClient: async (info, cb) => {
        await this._composedUpgradeMiddleware()
        cb(true)
      },
      handleProtocols: undefined,
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
      .on('connection', ws => {
        ws
          .on('message', message => {
            this.handleMessage(message, ws)
          })
          .once('error', () => {
            // hub.publish(token, error.message)
            // hub.unsubscribe(token)
            websocket.terminate()
          })
      })

    this._wss = wsServer
  }

  use(fn) {
    const _messageMiddleware = this._messageMiddleware
    _messageMiddleware.push(fn)
    this._composedMessageMiddleware = compose(_messageMiddleware)
    return this
  }

  async handleUpgrade(req, socket, head, extensions) {
    const ctx = createContext({
      _: {
        req,
        socket,
        head,
        extensions
      }
    })

    await this._composedUpgradeMiddleware(ctx)

    return _finishUpgradeHandling(ctx)
  }

  async handleMessage(message, websocket, request) {
    const ctx = createContext({
      _: {
        message,
        websocket,
        request,
        statusCode: DEFAULT_STATUS_CODE
      }
    })

    await this._composedMessageMiddleware(ctx)

    return _finishMessageHandling(ctx)
  }

  callback() {
    const wsServer = this._wss
    return (request, socket, head) => {
      wsServer.handleUpgrade(request, socket, head, ws => {
        wsServer.emit('connection', ws, request)
      })
    }
  }
}

module.exports = Ws
