const WebSocket = require('ws')
const Hub = require('../../pubsub')

class WsHub {
  constructor() {
    const wsServer = new WebSocket.Server({
      noServer: true,
      perMessageDeflate: {
        zlibDeflateOptions: { // See zlib defaults.
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        clientMaxWindowBits: 10, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024, // Size (in bytes) below which messages
        // should not be compressed.
      }
    })

    const hub = new Hub({
      separator: '/'
    })

    hub.create('/connect')
    hub.create('/disconnect')

    wsServer.on('connection', (request, websocket) => {
      websocket
        .once('close', () => {
          hub.publish(token, {
            address: request.connection.remoteAddress
          })
          hub.unsubscribe(token)
        })
        .once('error', () => {
          hub.publish(token, error.message)
          hub.unsubscribe(token)
          websocket.terminate()
        })

      const token = hub.subscribe('/connect', data => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            kind: 'connect',
            data
          }))
        }
      })

      hub.broadcast(token, {
        address: request.connection.remoteAddress
      })
    })

    this._wss = wsServer
    this._pubsub = hub
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

module.exports = WsHub
