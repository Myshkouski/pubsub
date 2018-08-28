<template lang="pug">
div
	span Hello,
	input(type="text" v-model="nickname")
	span !
	p Online:
	p(v-for="name of online") {{name}}
</template>

<script>
const connection = {}

function reconnect() {
  setTimeout(() => {
    connect(connection.serviceHost)
  }, 2000)
}

function connect(serviceHost) {
  const ws = new WebSocket('ws://' + serviceHost)

  Object.assign(connection, {
    serviceHost,
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

        if (data.kind == 'online') {
          this.online = data.online
        }
      } catch (error) {
        console.error(error)
      }
    })
  })

  return ws
}

export default {
  data() {
    return {
      nickname: 'nickname',
      online: []
    }
  },

  watch: {
    nickname(update) {
      this.syncName(update)
    }
  },

  methods: {
    syncName(name) {
      connection.ws.send(JSON.stringify({
        scope: '/name/' + this.nickname,
      }))
    }
  },

  created() {
    console.log('created', arguments)
  },

  mounted() {
    console.log('mounted', arguments)

    const serviceHost = window.location.hostname + ':8080'

    const ws = connect(serviceHost)

    ws.addEventListener('open', () => {
      this.syncName(this.nickname)
      connection.ws.send(JSON.stringify({
        scope: '/tick'
      }))
    })
  }
}
</script>
