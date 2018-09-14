const fs = require('fs')
const path = require('path')
const http = require('http')

const Koa = require('koa')
const KoaRouter = require('koa-router')
const compress = require('koa-compress')

const mime = require('mime')

const parseMessage = require('./parse-message-json')

const __static = path.resolve(process.cwd(), 'dist')

function serve(ctx, pathname) {
  pathname = path.join(__static, pathname)
  ctx.type = mime.getType(pathname)
  ctx.body = fs.createReadStream(pathname)
}

const app = new Koa()

const httpRouter = new KoaRouter()
httpRouter
  .get('/favicon(.ico)?', ctx => {
    serve(ctx, 'favicon.ico')
  })
  .get('/_nuxt/*', ctx => {
    serve(ctx, ctx.url)
  })
  .get('/*', ctx => {
    serve(ctx, ctx.url + '/index.html')
  })

app
  .use(httpRouter.routes())
  .use(httpRouter.allowedMethods())

const WsApp = require('./ws-app')
const WsRouter = require('./ws-router')
const WsFramework = require('./ws-framework')

// const Hub = require('../')
// const hub = new Hub({
//   separator: '/'
// })
//
// hub.create('/tick')
//
// setInterval(() => {
//   wsApp.publish({
//     scope: '/tick',
//     payload: Date.now()
//   })
// }, 1000).unref()
//
// const wsMessageRouter = new WsRouter()
// wsMessageRouter
//   .message(parseMessage())
//   .message('/tick', ctx => {
//     ctx.send({
//       scope: ctx.originalScope,
//       status: 'ok'
//     })
//
//     const token = hub.subscribe('/tick', data => {
//       ctx.send({
//         scope: ctx.originalScope,
//         payload: data
//       })
//     })
//
//     ctx.websocket.once('close', () => {
//       hub.unsubscribe(token)
//     })
//   })
//   .message('/name/:nick', ctx => {
//     ctx.send({
//       scope: ctx.scope,
//       originalScope: ctx.originalScope,
//       params: ctx.params,
//       payload: 'Hello, ' + ctx.params.nick + '!'
//     })
//   })
//
// const wsPublishRouter = new WsRouter()
// wsPublishRouter
//   .message((ctx, next) => {
//     if(ctx.app.connected.size) {
//       return next()
//     }
//   })
//   .message(parseMessage())
//   .message('/tick', ctx => {
//     const {
//       scope,
//       originalScope,
//       payload
//     } = ctx
//
//     ctx.publish({
//       scope,
//       originalScope,
//       payload
//     })
//   })
//
// wsApp
//   .message(wsMessageRouter.middleware())
//   .broadcast(wsPublishRouter.middleware())

const wsApp = new WsFramework()

wsApp.hub.create('tick')

wsApp.on('hello', console.log)

setInterval(() => {
  wsApp.hub.publish(['tick'], Date.now())
}, 1000).unref()

const server = http.createServer()

server.on('request', app.callback())
server.on('upgrade', wsApp.callback())

server.listen(8080)
