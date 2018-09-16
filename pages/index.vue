<template lang="pug">
div
	div
		span History
		span {{ ' ' }}
		input(type="number" v-model="historyLength")
	div(v-for="message of messageHistory")
		span(v-if="message.type" style="color:#0f0") {{'\u25BE'}}
		span(v-else style="color:#00f") {{'\u25B4'}}
		span {{message.data}}
</template>

<script>
const connection = {}

const debug = require('debug')('ws')

const onceOption = {
  once: 1
}

function Ws(options) {
  this._ws = null
  this._eventListeners = {}
  this._counters = {
    open: 0,
    close: 0
  }

  this.options = options || {}

  try {
    this.connect(options)
  } catch (error) {
    this.reconnect(options)
  }
}

Ws.prototype.counters = function getCounters() {
  return Object.assign({}, this._counters)
}

Ws.prototype.connect = function connect(options) {
  options = options || {}

  let scheme = 'ws'
  if (options.secure) {
    scheme += 's'
  }

  this._ws = new WebSocket(scheme + '://' + options.host || window.location.host, options.protocols || [])

  this._ws.addEventListener('open', () => {
    ++this._counters.open
    debug('websocket opened for the %d time', this._counters.open)
  }, onceOption)

  this._ws.addEventListener('close', () => {
    ++this._counters.close
    debug('websocket closed for the %d time', this._counters.close)
  }, onceOption)

  if (options.reconnect) {
    debug('add "close" event listener for reconecting with options: %j', options.reconnect)
    this._ws.addEventListener('close', () => {
      if (this._ws) {
        this._ws = null
        this.reconnect(this.options)
      }
    }, onceOption)
  }

  for (const event in this._eventListeners) {
    const args = this._eventListeners[event]
    for (const listeningArgs of args) {
      debug('add previously defined "%s" event listener', event)
      this._ws.addEventListener.apply(this._ws, [event].concat(listeningArgs))
    }
  }

  return this
}

Ws.prototype.reconnect = function reconnect(options) {
  const ws = this

  let timeout = 0

  if (typeof options === 'number') {
    timeout = options
  } else if (typeof options === 'object') {
    if (options.interval) {
      timeout = options.interval
    }
  }

  setTimeout(function() {
    try {
      ws.connect(ws.options)
    } catch (error) {
      ws.reconnect(options)
    }
  }, 2000)

  return this
}

const propNames = [
  'binaryType', 'bufferedAmount', 'extensions', 'onclose', 'onerror', 'onmessage', 'onopen', 'protocol', 'readyState', 'url'
]

const methodNames = [
  'send', 'close', 'dispatchEvent'
]

const propertyDescriptors = propNames.reduce((propertyDescriptors, propName) => {
  propertyDescriptors[propName] = {
    get() {
      return this._ws[propName]
    },
    set(value) {
      this._ws[propName] = value
    }
  }

  return propertyDescriptors
}, {})

const methodDescriptors = methodNames.reduce((methodDescriptors, methodName) => {
  propertyDescriptors[methodName] = {
    value() {
      return this._ws[methodName].apply(this._ws, arguments)
    }
  }

  return propertyDescriptors
}, {})

Object.defineProperties(Ws.prototype, propertyDescriptors)
Object.defineProperties(Ws.prototype, methodDescriptors)
Object.defineProperties(Ws.prototype, {
  addEventListener: {
    value(event, listener, options) {
      if (!this._eventListeners[event]) {
        this._eventListeners[event] = []
      }

      this._eventListeners[event].push(Array.prototype.slice.call(arguments, 1))

      if (this._ws) {
        if (options && options.once) {
          const ws = this

          this._ws.addEventListener(event, function() {
            const index = ws._eventListeners[event].findIndex(function(args) {
              return args[0] === listener
            })

            if (~index) {
              ws._eventListeners[event].splice(index, 1)
            }
          }, onceOption)
        }

        this._ws.addEventListener.apply(this._ws, arguments)
      }

      return this
    }
  },
  removeEventListener: {
    value(event, listener) {
      if (this._eventListeners[event]) {
        const index = this._eventListeners[event].findIndex(function(args) {
          return args[0] === listener
        })
        if (~index) {
          this._eventListeners[event].splice(index, 1)
        }

        if (!this._eventListeners[event].length) {
          delete this._eventListeners[event]
        }
      }

      if (this._ws) {
        this._ws.addEventListener.apply(this._ws, arguments)
      }

      return this
    }
  }
})

export default {
  data() {
    return {
      ws: null,
      messageHistory: [],
      historyLength: 20
    }
  },

  watch: {
    historyLength(value) {
      this.messageHistory = this.messageHistory.slice(-value)
    }
  },

  methods: {
    enter(room) {
      return this.send('+', room)
    },

    leave(room) {
      return this.send('-', room)
    },

    message(room, payload) {
      return this.send('!', room, payload)
    },

    send(type, room, payload) {
			const scope = type + '/' + room
			const data = [scope, payload].filter(value => !!value)

      this.ws.send(JSON.stringify(data))

      this.messageHistory.push({
        type: 0,
        data
      })

      return this
    }
  },

  head() {
    return {
      meta: [{
          charset: 'utf-8'
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1'
        }
      ]
    }
  },

  async mounted() {
    const host = window.location.hostname + ':8080'
    const protocols = ['json']
    const reconnect = 1000

    const ws = new Ws({
      host,
      protocols,
      reconnect
    })

    this.ws = ws

    Object.assign(connection, {
      host,
      ws
    })

    ws.addEventListener('error', event => {
      console.error('ws error', event)
    })

    ws.addEventListener('message', ({
      data
    }) => {
      try {
        data = JSON.parse(data)

        this.messageHistory.push({
          type: 1,
          data
        })

        if (this.messageHistory.length > this.historyLength) {
          this.messageHistory = this.messageHistory.slice(-this.historyLength)
        }
      } catch (error) {
        console.error(error)
      }
    })

    ws.addEventListener('open', () => {
      if (ws.counters().open > 1) {
        this.message('reconnect', true)
      }
    })

    ws.addEventListener('open', () => {
      this
        .enter('hello')
        .message('hello')

      this.enter('tick')

      setTimeout(() => {
        this.leave('tick')
      }, 2200)
    }, {
      once: true
    })
  }
}
</script>
