const ws = new WebSocket('ws://' + window.location.host)

ws.addEventListener('open', event => {
  console.log('ws opened')
  ws.send('Hello Server!')
})

ws.addEventListener('error', event => {
  console.log('ws error', event)
})

ws.addEventListener('close', event => {
  console.log('ws closed', event)
})

ws.addEventListener('message', event => {
  console.log('Message from server ', event.data)
})
