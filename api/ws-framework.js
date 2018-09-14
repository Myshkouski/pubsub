const EventEmitter = require('events')
const debug = require('debug')('ws-framework')
const WsApp = require('./ws-app')
const WsRouter = require('./ws-router')
const Hub = require('../')

async function onSubscribe(ctx, next) {
  await next()

  const channel = Hub.normalizeName(ctx.params.channel)

  const subscriptions = ctx.app.subscriptions.get(ctx.socket)

  const message = {
    scope: ctx.originalScope,
    payload: false
  }

  if(!subscriptions.has(channel)) {
    const token = ctx.app.hub.subscribe(channel, function subscriber(payload) {
      ctx.send({
        scope: '/message/' + channel,
        payload
      })
    })

    subscriptions.set(token.channel, token)

    message.payload = true
  }

  ctx.send(message)
}

async function onUnsubscribe(ctx, next) {
  await next()

  const channel = Hub.normalizeName(ctx.params.channel)

  const subscriptions = ctx.app.subscriptions.get(ctx.socket)

  const message = {
    scope: ctx.originalScope,
    payload: false
  }

  if(subscriptions.has(channel)) {
    const token = subscriptions.get(channel)

    token.unsubscribe()

    subscriptions.delete(channel)

    message.payload = true
  }

  ctx.send(message)
}

async function onMessage(ctx, next) {
  await next()

  ctx.emit(ctx.params.channel, ctx)
}

class Framework extends EventEmitter {
  constructor() {
    super()

    const app = new WsApp()
    this._app = app

    const router = new WsRouter()
    this._router = router

    app
      .upgrade(async (ctx, next) => {
        await next()

        if(!ctx.app.subscriptions.has(ctx.socket)) {
          ctx.app.subscriptions.set(ctx.socket, new Map())

          ctx.socket.once('close', () => {
            const subscriptions = ctx.app.subscriptions.get(ctx.socket)

            for(const token of subscriptions.values()) {
              token.unsubscribe()
            }

            ctx.app.subscriptions.delete(ctx.socket)
          })
        }
      })
      .message(router.middleware())

    router
      .message(require('./parse-message-json')())
      .message((ctx, next) => {
        ctx.emit = this.emit.bind(this)
        next()
      })
      .message('/subscribe/:channel', onSubscribe)
      .message('/unsubscribe/:channel', onUnsubscribe)
      .message('/message/:channel', onMessage)

    const hub = new Hub({
      separator: '/'
    })

    app.hub = hub
    app.subscriptions = new Map()
  }

  get hub() {
    return this._app.hub
  }

  callback() {
    return this._app.callback()
  }
}

module.exports = Framework
