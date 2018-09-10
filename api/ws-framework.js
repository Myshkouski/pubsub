const debug = require('debug')('ws-framework')
const WsApp = require('./ws-app')
const WsRouter = require('./ws-router')

async function onSubscribe(ctx, next) {
  await next()

  debug('onSubscribe')
}

async function onUnsubscribe(ctx, next) {
  await next()

  debug('onUnsubscribe')
}

function Factory() {
  const app = new WsApp()
  const router = new WsRouter()
  const Hub = require('../')

  app.message(router.middleware())

  router
    .message(require('./parse-message-json')())
    .message('/subscribe', onSubscribe)
    .message('/unsubscribe', onUnsubscribe)

  const hub = new Hub({
    separator: '/'
  })

  app.hub = hub

  return app
}

module.exports = Factory
