const compose = require('koa-compose')
const WebSocket = require('../../ws')
const http = require('http')
const createContext = require('./context')
const debug = require('debug')('ws-app')
// const Hub = require('../../pubsub')

const DEFAULT_UPGRADE_STATUS_CODE = 101
const DEFAULT_WS_CLOSE_CODE = 1008

const DEFAULT_OPTIONS = {
  perMessageDeflate: {
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
    clientNoContextTakeover: true,
    // Defaults to negotiated value.
    serverNoContextTakeover: true,
    // Defaults to negotiated value.
    clientMaxWindowBits: 10,
    // Defaults to negotiated value.
    serverMaxWindowBits: 10,

    // Below options specified as default values.
    // Limits zlib concurrency for perf.
    concurrencyLimit: 10,
    // Size (in bytes) below which messages
    // should not be compressed.
    threshold: 1024,
  }
}

const FORCED_OPTIONS = {
  noServer: true
}

function serialize(message) {
  if (Buffer.isBuffer(message)) {
    return message
  }

  const typeOfMessage = typeof message

  if (typeOfMessage === 'string') {
    return message
  }

  if (typeOfMessage === 'object') {
    return JSON.stringify(message)
  }

  throw new TypeError('Cannot stringify message of type "' + typeOfMessage + '"')
}

async function _handleUpgrade(req, socket, head, extensions, headers) {
  const ctx = createContext({
    app: this,
    req,
    socket,
    head,
    extensions,
    statusCode: DEFAULT_UPGRADE_STATUS_CODE
  })

  await this._composedUpgradeMiddleware(ctx)

  this._wss.completeUpgrade(req, socket, head, extensions, headers)

  return ctx
}

async function _handleMessage(websocket, req, socket, head, extensions, headers, message) {
  const ctx = createContext({
    app: this,
    message,
    websocket,
    req,
    statusCode: DEFAULT_WS_CLOSE_CODE,
    serialize,
    send(message) {
      message = this.serialize(message)
      websocket.send(message)
    },
    publish(message) {
      message = this.serialize(message)

      for (let websocket of this.app._wss.clients) {
        if (websocket !== this.websocket) {
          websocket.send(message)
        }
      }
    }
  })

  await this._composedMessageMiddleware(ctx)

  // if (ctx.statusCode === DEFAULT_WS_STATUS_CODE) {
  //   ctx.websocket.close(ctx.statusCode, ctx.status)
  // }

  return ctx
}

function _handleError(websocket, error) {
  console.error(error)
  websocket.terminate()
}

class WsApp {
  constructor(options = {}) {
    const upgradeMiddleware = []
    this._upgradeMiddleware = upgradeMiddleware
    this._composedUpgradeMiddleware = compose(upgradeMiddleware)
    this._isUpgradeMiddlewareUsed = false

    const messageMiddleware = []
    this._messageMiddleware = messageMiddleware
    this._composedMessageMiddleware = compose(messageMiddleware)

    const broadcastMiddleware = []
    this._broadcastMiddleware = broadcastMiddleware
    this._composedBroadcastMiddleware = compose(broadcastMiddleware)

    const wsServer = new WebSocket.Server(Object.assign({}, DEFAULT_OPTIONS, options, FORCED_OPTIONS))

    wsServer
      .on('upgrade', _handleUpgrade.bind(this))
      .on('connection', (websocket, req, socket, head, extensions, headers) => {
        websocket
          .on('message', _handleMessage.bind(this, websocket, req, socket, head, extensions, headers))
          .once('error', _handleError.bind(websocket))
      })

    this._wss = wsServer
  }

  upgrade(fn) {
    if (this._isUpgradeMiddlewareUsed) {
      throw new Error('Upgrade middleware should be used before message middlewares')
    }

    const upgradeMiddleware = this._upgradeMiddleware
    upgradeMiddleware.push(fn.bind(this))
    this._composedUpgradeMiddleware = compose(upgradeMiddleware)

    debug('defined upgrade middleware')

    return this
  }

  message(fn) {
    this._isUpgradeMiddlewareUsed = true

    const _messageMiddleware = this._messageMiddleware
    _messageMiddleware.push(fn.bind(this))
    this._composedMessageMiddleware = compose(_messageMiddleware)

    debug('defined message middleware')

    return this
  }

  broadcast(fn) {
    const _broadcastMiddleware = this._broadcastMiddleware
    _broadcastMiddleware.push(fn.bind(this))
    this._composedBroadcastMiddleware = compose(_broadcastMiddleware)

    debug('defined broadcast middleware')

    return this
  }

  async publish(message) {
    const ctx = createContext({
      // dummy req
      req: {},
      app: this,
      message,
      serialize,
      publish(message) {
        message = this.serialize(message)
        for (const websocket of this.app._wss.clients) {
          websocket.send(message)
        }
      }
    })

    return await this._composedBroadcastMiddleware(ctx)
  }

  callback() {
    // no callback passed to ws server, instead it emits 'upgrade' event
    return (req, socket, head) => this._wss.handleUpgrade(req, socket, head /*, cb*/ )
  }
}

module.exports = WsApp