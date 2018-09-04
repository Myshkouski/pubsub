module.exports = createContext

const requestUpgradeProto = {

}

function createUpgradeContext() {
  const ctx = {}
}

class Context {
  constructor(request, socket, head) {
    const ctx = this

    Object.defineProperties(ctx. {
      request: {
        get() {
          return request
        }
      },
      socket: {
        get() {
          return socket
        }
      },
      head: {
        get() {
          return head
        }
      },
      headers: {
        get() {
          return this.request.headers
        }
      },
      responseHeaders: {
        value: {}
      }
    })

    Object.assign(ctx, {
      get url() {
        return this.request.url
      }
    })
  }
}

class UpgradeContext extends Context {
  constructor(request, socket, head) {
    super(request, socket, head)

    const ctx = this

    Object.defineProperties(ctx. {

    })

    Object.assign(ctx, {
      get url() {
        return this.request.url
      }
    })
  }

  set(header, value) {
    this.responseHeaders[header] = value
  }
}

class MessageContext extends Context {
  constructor(message, websocket, request, socket, head) {
    super(request, socket, head)

    const ctx = this

    Object.defineProperties(ctx. {
      message: {
        value: message
      }
    })

    Object.assign(ctx, {
      get url() {
        return this.request.url
      }
    })
  }

  set(header, value) {
    this.responseHeaders[header] = value
  }
}

function createContext(src) {
  const ctx = {}

  Object.defineProperty(ctx, '_', {
    value: Object.assign({}, src._ || {})
  })

  const obj = Object.assign({}, src)
  if ('_' in obj) {
    delete obj._
  }
  Object.assign(ctx, obj)

  for (const nonEnumerableKey in ctx._) {
    Object.defineProperty(ctx, nonEnumerableKey, {
      get() {
        return this._[nonEnumerableKey]
      }
    })
  }

  return ctx
}
