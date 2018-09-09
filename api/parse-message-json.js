const debug = require('debug')('parse-message')

function deserialize(ctx, next) {
  let {
    message
  } = ctx

  const rawMessage = message

  const typeOfMessage = typeof message

  let scope, payload

  if (typeOfMessage !== 'object') {
    if (Buffer.isBuffer(message)) {
      message = message.toString()
    } else if (typeOfMessage !== 'string') {
      throw new TypeError('Cannot parse message of type "' + typeOfMessage + '"')
    }

    message = JSON.parse(message)
  }

  ctx.scope = message.scope
  ctx.payload = message.payload

  debug('scope', ctx.scope)
  debug('payload', '' + ctx.payload)

  return next()
}

module.exports = () => {
  return function (ctx, next) {
    ctx.deserialize = deserialize
    return deserialize(ctx, next)
  }
}
