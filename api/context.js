module.exports = createContext

function createContext(src) {
  const ctx = {}

  Object.defineProperty(ctx, '_', {
    value: Object.assign({}, src._ || {})
  })

  const obj = Object.assign({}, src)
  if('_' in obj) {
    delete obj._
  }
  Object.assign(ctx, obj)

  for(const nonEnumerableKey in ctx._) {
    Object.defineProperty(ctx, nonEnumerableKey, {
      get() {
        return this._[nonEnumerableKey]
      }
    })
  }

  return ctx
}
