const fs = require('fs')
const path = require('path')
const http = require('http')
const debug = require('debug')('http')

const Koa = require('koa')
const KoaRouter = require('koa-router')
const compress = require('koa-compress')

// const SocketIo = require('socket.io')

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

const Ws = require('./ws')
const WsRouter = require('./wsRouter')
const ws = new Ws()
const wsRouter = new WsRouter()

wsRouter
  .use((ctx, next) => {
    ctx.send('hello world')
    next()
  })
  .use('/name/:nick', ctx => {
    ctx.send({
      scope: ctx.originalScope,
      payload: 'Hello, ' + ctx.params.nick + '!'
    })
  })

ws
  .use(require('./parseMessage')())
  .use(wsRouter.middleware())

const server = http.createServer()

server.on('request', app.callback())
server.on('upgrade', ws.callback())

server.listen(8080)
