const pathToRegexp = require('path-to-regexp')
const normalizePath = require('normalize-path')
const compose = require('koa-compose')
const debug = require('debug')('ws-router')
const createContext = require('./context')

function isMatch(scope, re) {
  if(re) {
    return re.exec(scope)
  }

  return true
}

class WebsocketRouter {
  constructor(options = {}) {
    const middleware = []
    this._middleware = middleware
    this._composedMiddleware = compose(middleware)
  }

  message() {
    let path, re, keys, toPath
    let fn = arguments[0]

    if (1 in arguments) {
      path = fn
      fn = arguments[1]

      // path = normalizePath(path)

      toPath = pathToRegexp.compile(path)
      keys = []
      re = pathToRegexp(path, keys, {
        end: false
      })
    }

    this._middleware.push(function(ctx, next) {
      let {
        scope
      } = ctx

      if(scope) {
        // scope = normalizePath(ctx.scope)

        if(!('originalScope' in ctx)) {
          ctx.originalScope = scope
        }
      }

      let shouldHandle = true
      let match

      if (re && scope) {
        match = isMatch(scope, re)

        if(!match) {
          shouldHandle = false
        } else {
          ctx = createContext(ctx)
          match = match.slice(1)

          const params = {}

          if (keys && keys.length) {
            for (const index in keys) {
              const {
                name
              } = keys[index]

              params[name] = match[index]
            }

            ctx.params = Object.assign(ctx.params || {}, params)
          }

          if(toPath) {
            scope = scope.slice(toPath(params).length)
          }

          ctx.scope = scope.length ? scope : '/'
        }
      }

      if (shouldHandle) {
        return fn(ctx, next)
      }

      return next()
    })

    this._composedMiddleware = compose(this._middleware)

    debug('defined scope', path || '(.*)')

    return this
  }

  middleware() {
    return this._composedMiddleware.bind(this)
  }
}

module.exports = WebsocketRouter
