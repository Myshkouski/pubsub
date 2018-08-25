const fs = require('fs')
const path = require('path')
const http = require('http')
const debug = require('debug')('http')

const Koa = require('koa')
const KoaRouter = require('koa-router')
const compress = require('koa-compress')

const WsHub = require('./wsHub')

// const SocketIo = require('socket.io')

// const mime = require('mime')
//
// const __static = path.resolve(process.cwd(), 'static')
//
// const staticRouter = new KoaRouter()
// staticRouter
//   .prefix('/static')
//   .use(compress({
//     threshold: 2048,
//     flush: require('zlib').Z_SYNC_FLUSH
//   }))
//   .get('/:path*', async ctx => {
//     await new Promise((resolve, reject) => {
//       const pathname = path.resolve(__static, ctx.params.path)
//       const fileStream = fs.createReadStream(pathname)
//
//       fileStream
//         .once('data', () => {
//           ctx.status = 200
//           ctx.set('content-type', mime.getType(pathname))
//         })
//         .once('error', error => {
//           fileStream.removeAllListeners()
//           reject(error)
//         })
//         .pipe(ctx.res)
//         .once('finish', () => {
//           resolve()
//         })
//     })
//   })

const app = new Koa()

const httpRouter = new KoaRouter()
// httpRouter
  // .use(staticRouter.routes())
  // .use(staticRouter.allowedMethods())
  // .redirect('/', '/static/index.html')

app
  .use(httpRouter.routes())
  .use(httpRouter.allowedMethods())

const wsHub = new WsHub()

const server = http.createServer()

server.on('request', app.callback())
server.on('upgrade', wsHub.callback())

server.listen(8080)
