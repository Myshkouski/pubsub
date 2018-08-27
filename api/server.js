const fs = require('fs')
const path = require('path')
const http = require('http')
const debug = require('debug')('http')

const Koa = require('koa')
const KoaRouter = require('koa-router')
const compress = require('koa-compress')

const WsHub = require('./wsHub')

// const SocketIo = require('socket.io')

const mime = require('mime')

const __static = path.resolve(process.cwd(), 'dist')

const staticRouter = new KoaRouter()
staticRouter
  .prefix('/static')
  .redirect('/', '/index.html')
  .use(compress({
    threshold: 512
  }))
  .get('/:path*', async ctx => {
    const pathname = path.resolve(__static, ctx.params.path)
    ctx.type = mime.getType(pathname)
    ctx.body = fs.createReadStream(pathname)
  })

const app = new Koa()

const httpRouter = new KoaRouter()
httpRouter
  .redirect('/', '/static')
  .all('/_nuxt/*', ctx => {
    ctx.redirect('/static' + ctx.url)
  })
  .use(staticRouter.routes())
  .use(staticRouter.allowedMethods())

app
  .use(httpRouter.routes())
  .use(httpRouter.allowedMethods())

const wsHub = new WsHub()

const server = http.createServer()

server.on('request', app.callback())
server.on('upgrade', wsHub.callback())

server.listen(8080)
