const debug = require('debug')('ws-framework')
const WsApp = require('./ws-app')
const WsRouter = require('./ws-router')

async function onSubscribe(ctx, next) {
  await next()

  const channel = ctx.scope

  function subscriber(payload) {
    ctx.send({
      scope: channel,
      payload
    })
  }

  const token = ctx.app.hub.subscribe(ctx.scope, subscriber)

  ctx.app.subscriptions
    .get(ctx.socket)
    .add(token)

  ctx.websocket.once('close', () => {
    token.unsubscribe()
  })
}

async function onUnsubscribe(ctx, next) {
  await next()

  debug('onUnsubscribe')
}

function Factory() {
  const app = new WsApp()
  const router = new WsRouter()
  const Hub = require('../')

  app
    .upgrade(async (ctx, next) => {
      await next()

      if(!ctx.app.subscriptions.has(ctx.websocket)) {
        ctx.app.subscriptions.set(ctx.socket, new Set())

        ctx.socket.once('close', () => {
          ctx.app.subscriptions.delete(ctx.socket)
          debug('remove subscription due to socket closed')
        })
      }

      console.log('!', ctx.app.subscriptions)
    })
    .message(router.middleware())

  router
    .message(require('./parse-message-json')())
    .message('/subscribe', onSubscribe)
    .message('/unsubscribe', onUnsubscribe)

  const hub = new Hub({
    separator: '/'
  })

  app.hub = hub
  app.subscriptions = new Map()

  return app
}

module.exports = Factory
