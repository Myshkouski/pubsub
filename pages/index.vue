<template lang="pug">
div
	span Hello,
	input(type="text" v-model="nickname")
	span !
	p Online:
	p(v-for="name of online") {{name}}
</template>

<script>
import SocketIo from 'socket.io-client'
const connection = {}

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
				kind: '/name',
				name
			}))

			// connection.io.emit('name', this.nickname)
		}
	},

	async mounted() {
		const serviceHost = window.location.hostname + ':8080'

		const ws = new WebSocket('ws://' + serviceHost)
		// const io = SocketIo('ws://' + serviceHost, {
		// 	// transports: ['websocket']
		// })

		Object.assign(connection, {
			serviceHost,
			ws,
			// io
		})

		ws.addEventListener('open', event => {
			console.log('ws opened')

			ws.addEventListener('error', event => {
				console.log('ws error', event)
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

			this.syncName(this.nickname)
		})

		// io.on('connect', () => {
		// 	this.syncName(this.nickname)
		//
		// 	io.on('online', data => {
		// 		this.online = data
		// 	})
		// })
	}
}
</script>
