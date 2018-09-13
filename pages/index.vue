<template lang="pug">
div
	div
		span History
		span {{ ' ' }}
		input(type="number" v-model="historyLength")
	div(v-for="message of messageHistory")
		span {{message.type}}
		span {{message.data}}
</template>

<script>
const connection = {}

function reconnect() {
  setTimeout(() => {
    connect(connection.host)
  }, 2000)
}

function createWebsocket(options) {
  var scheme = 'ws'
  if (options.secure) {
    scheme += 's'
  }

  return new WebSocket(scheme + '://' + options.host || window.location.host, options.protocols || [])
}

function reconnect(options) {
  return function() {
		console.log('reconnecting...', options.reconnect)
    setTimeout(() => {
      this._ws = createWebsocket(options)
      this.addEventListener('close', reconnect(options))
    }, options.reconnect)
  }
}

function Ws(options) {
  options = options || {}

  this._ws = createWebsocket(options)

  if (options.reconnect) {
    this.addEventListener('close', reconnect(options))
  }
}

var propNames = [
  'binaryType', 'bufferedAmount', 'extensions', 'onclose', 'onerror', 'onmessage', 'onopen', 'protocol', 'readyState', 'url',
]

var methodNames = [
  'send', 'close', 'addEventListener', 'removeEventListener'
]

var propertyDescriptors = propNames.reduce((propertyDescriptors, propName) => {
  propertyDescriptors[propName] = {
    get() {
      return this._ws[propName]
    }
  }

  return propertyDescriptors
}, {})

var methodDescriptors = methodNames.reduce((methodDescriptors, methodName) => {
  propertyDescriptors[methodName] = {
    value() {
			return this._ws[methodName].apply(this._ws, arguments)
		}
  }

  return propertyDescriptors
}, {})

Object.defineProperties(Ws.prototype, propertyDescriptors)
Object.defineProperties(Ws.prototype, methodDescriptors)

function connect(host, protocols) {
  return new Promise(resolve => {
    const ws = new Ws({
      host,
      protocols,
			reconnect: 1000
    })

    Object.assign(connection, {
      host,
      ws
    })

    ws.addEventListener('open', event => {
      console.log('ws opened')

      ws.addEventListener('error', event => {
        console.log('ws error', event)
        reconnect()
      })

      ws.addEventListener('close', event => {
        console.log('ws closed', event)
      })

      ws.addEventListener('message', ({
        data
      }) => {
        try {
          data = JSON.parse(data)

          this.messageHistory.push({
            type: '\u25BE',
            data
          })

          if (this.messageHistory.length > this.historyLength) {
            this.messageHistory = this.messageHistory.slice(-this.historyLength)
          }
        } catch (error) {
          console.error(error)
        }
      })

      resolve(ws)
    })
  })
}

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
		subscribe(channel) {
			this.send({
				scope: '/subscribe/' + channel
			})
		},

		unsubscribe(channel) {
			this.send({
				scope: '/unsubscribe/' + channel
			})
		},

		send(data) {
			this.ws.send(JSON.stringify(data))

			this.messageHistory.push({
	      type: '\u25B4',
	      data
	    })
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
		this.ws = await connect.call(this, window.location.hostname + ':8080', ['json'])

		this.subscribe('tick')
		this.subscribe('tick')

		setTimeout(() => {
			this.unsubscribe('tick')
			this.unsubscribe('tick')
		}, 2000)
  }
}
</script>
