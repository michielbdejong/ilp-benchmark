const http = require('http')
const fetch = require('node-fetch')
const uuid = require('uuid/v4')
const crypto = require('crypto')

const conditions = []
const fulfillments = {}
const ids = {}
for (let i=0; i<111110; i++) {
  let fulfillment = crypto.randomBytes(32).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '')
  let condition = crypto.createHmac('sha256', fulfillment).digest('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '')
  fulfillments[condition] = fulfillment
  conditions.push(condition)
}
let numSent = 0
let numFull = 0
let numSucc = 0
let startTime

function makeBody(thisBatchTimeout) {
  const outgoingUuid = uuid()
  const condition = conditions.pop()
  ids[outgoingUuid] = fulfillments[condition]
  return [ {
    id: outgoingUuid,
    executionCondition: condition,
    expiresAt: this.BatchTimeout,
    ledger: 'peer.1.',
    from: 'peer.1.benchmarker',
    to: 'peer.1.system',
    amount: '2',
    ilp: 'ARkAAAAAAAAAAQ50ZXN0LmJlbmNobWFyawAA' // node ./createTestPacket.js 1 "test.benchmark" ""
  } ]
}

function sendBatch(creds, batchSize) {
  const thisBatchTimeout = new Date(new Date().getTime() + 10000)
  console.log(`After ${new Date().getTime() - startTime}ms, success ${numSucc}/${numSent} (fulfilled ${numFull})`)
  for (let i=0; i<batchSize; i++) {
    fetch(creds.uri, {
      method: 'POST', headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + creds.token
      }, body: JSON.stringify(makeBody(thisBatchTimeout), null, 2)
    }).catch(() => {})
    numSent++
  }
}

function parseIlpSecret(ilpSecret, method) {
  const peerCaps = Buffer.from(ilpSecret.substring('ilp_secret:v1:'.length), 'base64').toString('ascii')
  const [ /* 'PROTOCOL://LEDGER:TOKEN@HOST/PATH */, protocol, ledgerPrefix, token, hostname, rpcPath ] = peerCaps.match(/(http[s]{0,1}):\/\/(.*):(.*)\@(.*)\/(.*)/i)
  return {
    uri: protocol + '://' + hostname + '/' + rpcPath + '?method=' + method + '&prefix=' + ledgerPrefix,
    token
  }
}

function setupDoner(port) {
  http.createServer((req, res) => {
    let str = ''
    req.on('data', (chunk) => { str += chunk })
    req.on('end', () => {
      const arr = JSON.parse(str)
      // console.log('done', arr)
      if (ids[arr[0]] === arr[1]) {
        delete ids[arr[0]]
        numSucc++
        res.end('true')
      } else {
        res.end('false')
      }
    })
  }).listen(port)
  console.log('Doner set up on port', port)
}

function setupFulfiller(creds, port) {
  http.createServer((req, res) => {
    let str = ''
    req.on('data', (chunk) => { str += chunk })
    req.on('end', () => {
      const obj = JSON.parse(str)[0]
      const body = JSON.stringify([ obj.id, fulfillments[obj.executionCondition] ], null, 2)
      // console.log('Fulfilling', obj, body)
      fetch(creds.uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + creds.token
        },
        body
      }).catch(() => {})
    })
    numFull++
  }).listen(port)
  console.log('Fulfiller set up on port', port, 'will fulfill using', creds)
}

function testServer(exe, script, senderPort, senderIlpSecret, receiverPort, receiverIlpSecret) {
  const senderCreds = parseIlpSecret(senderIlpSecret, 'send_transfer')
  setupDoner(senderPort)
  setupFulfiller(parseIlpSecret(receiverIlpSecret, 'fulfill_condition'), receiverPort)
  console.log({ senderCreds })
  setTimeout(() => { sendBatch(senderCreds, 100) }, 10000)
  setTimeout(() => { sendBatch(senderCreds, 1000) }, 20000)
  setTimeout(() => { sendBatch(senderCreds, 10000) }, 30000)
  setTimeout(() => { sendBatch(senderCreds, 100000) }, 40000)
  startTime = new Date().getTime()
  sendBatch(senderCreds, 10)
}

if (process.argc < 6) {
  console.log('usage: node ./benchmarker.js senderPort senderIlpSecret receiverPort receiverIlpSecret')
  process.exit(1)
}

testServer.apply(null, process.argv)
