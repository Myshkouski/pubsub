const WsApp = require('./ws-app')
const WsRouter = require('./ws-router')

function onSubscribe(ctx, next) {
  return next()
}

function onUnsubscribe(ctx, next) {
  return next()
}

function Factory() {
  const app = new WsApp()
  const router = new WsRouter()

  app.message(router.middleware())

  router
    .message(require('./parse-message-json')())
    .message('/subscribe', onSubscribe)
    .message('/unsubscribe', onUnsubscribe)
}

module.exports = WsFramework
