const util = require('util')

const proto = {
  request: {
    get method() {
      return this.req.method
    },

    get url() {
      return this.req.url
    },

    get headers() {
      return this.req.headers
    }
  },

  get method() {
    return this.request.method
  },

  get url() {
    return this.request.url
  },

  get headers() {
    return this.request.headers
  },

  toJSON() {
    return {
      request: this.request,
      url: this.url,
      headers: this.headers
    }
  },

  toString() {
    return JSON.stringify(this.toJSON())
  },

  inspect() {
    return this.toJSON()
  }
}

if (util.inspect.custom) {
  proto[util.inspect.custom] = proto.inspect
}

const ownPropertyDescriptors = Object.getOwnPropertyDescriptors(proto)

function createContext(src) {
  const ctx = Object.assign({}, src)

  Object.defineProperties(ctx, ownPropertyDescriptors)

  return ctx
}

module.exports = createContext
