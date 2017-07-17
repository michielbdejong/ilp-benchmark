const http = require('http')
const fetch = require('node-fetch')
const parallelism = parseInt(process.argv[2])

let served=0
let fetched=0
http.createServer((req, res) => {
  let str = ''
  req.on('data', (chunk) => { str += chunk })
  req.on('end', () => {
    res.end('ack')
    served++
  })
}).listen(12345)

function sendOne() {
  fetch('http://localhost:12345', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ASDF'
    },
    body: 'BLABLABLA'
  }).catch((e) => { console.error('could not fetch', e) }).then(() => {
    fetched++
    if (fetched === 10000) {
      console.log('done', { time: new Date().getTime() - startTime, served, fetched, parallelism, reqPerSec: 10000000/(new Date().getTime() - startTime) })
      process.exit(0)
    }
    sendOne()
  })
}

startTime = new Date().getTime()
for(let sent = 0; sent < parallelism; sent++) {
  sendOne()
}
