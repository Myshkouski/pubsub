module.exports = function() {
  return (ctx, next) => {
    const {
      scope,
      payload
    } = JSON.parse(ctx.message)

    Object.assign(ctx, {
      scope,
      originalScope: scope,
      payload
    })

    function send(message) {
      if(typeof message == 'object') {
        message = JSON.stringify(message)
      }

      ctx.statusCode = 1000
      ctx.websocket.send(message)
    }

    ctx._.send = send
    Object.defineProperty(ctx, 'send', {
      value: send
    })

    next()
  }
}
