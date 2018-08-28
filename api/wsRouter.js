const pathToRegexp = require('path-to-regexp')
const normalizePath = require('normalize-path')
const compose = require('koa-compose')
const createContext = require('./context')

class WebsocketRouter {
  constructor() {
    this._middleware = []
  }

  use() {
    let path = '(.*)'
    let middleware = arguments[0]

    if (1 in arguments) {
      path = middleware
      middleware = arguments[1]
    }

    path = normalizePath(path)

    const toPath = pathToRegexp.compile(path)
    const keys = []
    const re = pathToRegexp(path, keys, {
      end: false
    })

    this._middleware.push((ctx, next) => {
      if (typeof ctx.scope !== 'string') {
        return next()
      }

      let scope = normalizePath(ctx.scope)
      let match = re.exec(scope)

      if (match) {
        const _ctx = createContext(ctx)
        match = match.slice(1)

        const params = {}

        if (keys.length) {
          for (const index in keys) {
            const {
              name
            } = keys[index]

            params[name] = match[index]
          }

          _ctx.params = Object.assign(_ctx.params || {}, params)
        }

        scope = scope.slice(toPath(params).length)

        _ctx.scope = scope.length ? scope : '/'

        const res = middleware(_ctx, next)

        return res
      } else {
        return next()
      }
    })

    return this
  }

  middleware() {
    return compose(this._middleware)
  }
}

module.exports = WebsocketRouter
