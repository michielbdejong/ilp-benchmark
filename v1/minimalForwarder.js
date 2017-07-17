const http = require('http')
const fetch = require('node-fetch')
const crypto = require('crypto')

function parseIlpSecret(ilpSecret, method) {
  const peerCaps = Buffer.from(ilpSecret.substring('ilp_secret:v1:'.length), 'base64').toString('ascii')
  const [ /* 'PROTOCOL://LEDGER:TOKEN@HOST/PATH */, protocol, ledgerPrefix, token, hostname, rpcPath ] = peerCaps.match(/(http[s]{0,1}):\/\/(.*):(.*)\@(.*)\/(.*)/i)
  return {
    uri: protocol + '://' + hostname + '/' + rpcPath + '?method=' + method + '&prefix=' + ledgerPrefix,
    token
  }
}

function setupProxy(incomingPort, onwardCreds) {
  console.log('we listen on port', incomingPort, 'and forward to', onwardCreds)
  http.createServer((req, res) => {
    let str = ''
    req.on('data', (chunk) => { str += chunk })
    req.on('end', () => {
      res.end('forwarding')
      fetch(onwardCreds.uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + onwardCreds.token
        },
        body: str
      }).catch((e) => { console.error('could not proxy', e) })
    })
  }).listen(incomingPort)
}

function setupProxies(exe, script, senderPort, senderIlpSecret, receiverPort, receiverIlpSecret) {
  console.log('setting up sender-side:')
  setupProxy(senderPort, parseIlpSecret(receiverIlpSecret, 'send_transfer'))
  console.log('setting up receiver-side:')
  setupProxy(receiverPort, parseIlpSecret(senderIlpSecret, 'fulfill_condition'))
}

if (process.argc < 6) {
  console.log('usage: node ./minimalForwarder.js senderPort senderIlpSecret receiverPort receiverIlpSecret')
  process.exit(1)
}

setupProxies.apply(null, process.argv)
