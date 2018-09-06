const compose = require('koa-compose')
const WebSocket = require('../../ws')
const http = require('http')
const createContext = require('./context')
// const Hub = require('../../pubsub')

const DEFAULT_UPGRADE_STATUS_CODE = 101
const DEFAULT_WS_STATUS_CODE = 1005

function _finishUpgradeHandling(ctx) {
  return ctx
}

function _finishMessageHandling(ctx) {
  console.log(ctx)
  if (ctx.statusCode === DEFAULT_WS_STATUS_CODE) {
    ctx.websocket.close(ctx.statusCode, ctx.status)
  }

  return ctx
}

class Ws {
  constructor() {
    const upgradeMiddleware = []
    this._upgradeMiddleware = upgradeMiddleware
    this._composedUpgradeMiddleware = compose(upgradeMiddleware)

    const messageMiddleware = []
    this._messageMiddleware = messageMiddleware
    this._composedMessageMiddleware = compose(messageMiddleware)

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
      .on('upgrade', async (req, socket, head, extensions) => {
        const ctx = await this.handleUpgrade(req, socket, head, extensions)

        wsServer.completeUpgrade(req, socket, head, extensions, ctx.responseHeaders)
      })
      .on('connection', websocket => {
        websocket
          .on('message', message => {
            this.handleMessage(message, websocket)
          })
          .once('error', () => {
            websocket.terminate()
          })
      })

    this._wss = wsServer
  }

  upgrade(fn) {
    const upgradeMiddleware = this._upgradeMiddleware
    upgradeMiddleware.push(fn)
    this._composedUpgradeMiddleware = compose(upgradeMiddleware)
    return this
  }

  messsage(fn) {
    const _messageMiddleware = this._messageMiddleware
    _messageMiddleware.push(fn)
    this._composedMessageMiddleware = compose(_messageMiddleware)
    return this
  }

  async handleUpgrade(req, socket, head, extensions) {
    const ctx = createContext({
      req,
      socket,
      head,
      extensions,
      statusCode: DEFAULT_UPGRADE_STATUS_CODE
    })

    await this._composedUpgradeMiddleware(ctx)

    return _finishUpgradeHandling(ctx)
  }

  async handleMessage(message, websocket, req) {
    const ctx = createContext({
      message,
      websocket,
      req,
      statusCode: DEFAULT_WS_STATUS_CODE
    })

    await this._composedMessageMiddleware(ctx)

    return _finishMessageHandling(ctx)
  }

  callback() {
    return (req, socket, head) => {
      this._wss.handleUpgrade(req, socket, head)
    }
  }
}

module.exports = Ws
