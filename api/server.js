const fs = require('fs')
const path = require('path')
const http = require('http')

const Koa = require('koa')
const KoaRouter = require('koa-router')
const compress = require('koa-compress')

const mime = require('mime')

const __static = path.resolve(process.cwd(), 'dist')

function serve(ctx, pathname) {
  ctx.type = mime.getType(pathname)
  ctx.body = fs.createReadStream(pathname)
}

const app = new Koa()

const httpRouter = new KoaRouter()
httpRouter
  .get('/_nuxt/*', ctx => {
    serve(ctx, path.join(__static, ctx.url))
  })
  .get('/*', ctx => {
    serve(ctx, path.join(__static, ctx.url, 'index.html'))
  })

app
  .use(httpRouter.routes())
  .use(httpRouter.allowedMethods())

const WsApp = require('./ws')
const WsRouter = require('./wsRouter')
const wsApp = new WsApp()
const wsRouter = new WsRouter()

const Hub = require('../')
const hub = new Hub({
  separator: '/'
})

hub.create('/tick')

setInterval(() => {
  hub.publish('/tick', Date.now())
}, 1000).unref()

wsRouter
  .message(require('./parseMessage')())
  .message('/tick', ctx => {
    ctx.send({
      scope: ctx.originalScope,
      status: 'ok'
    })

    const token = hub.subscribe('/tick', data => {
      ctx.send({
        scope: ctx.originalScope,
        payload: data
      })
    })

    ctx.websocket.once('close', () => {
      hub.unsubscribe(token)
    })
  })
  .message('/name/:nick', ctx => {
    ctx.send({
      scope: ctx.originalScope,
      params: ctx.params,
      payload: 'Hello, ' + ctx.params.nick + '!'
    })
  })

wsApp.message(wsRouter.middleware())

const server = http.createServer()

server.on('request', app.callback())
server.on('upgrade', wsApp.callback())

server.listen(8080)
