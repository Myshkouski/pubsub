const debug = require('debug')('parse-message')

function deserialize(ctx, next) {
  let {
    message
  } = ctx

  const rawMessage = message

  const typeOfMessage = typeof message

  if(typeOfMessage !== 'object') {
    if(Buffer.isBuffer(message)) {
      message = message.toString()
    } else if(typeOfMessage !== 'string') {
      throw new TypeError('Cannot parse message of type "' + typeOfMessage + '"')
    }
  }

  const {
    scope,
    payload
  } = JSON.parse(message)

  message = {
    scope,
    payload
  }

  ctx.scope = scope
  ctx.payload = payload

  debug('scope', scope)
  debug('payload', '' + payload)

  next()
}

module.exports = () => {
  return function(ctx, next) {
    ctx.deserialize = deserialize
    return deserialize(ctx, next)
  }
}
