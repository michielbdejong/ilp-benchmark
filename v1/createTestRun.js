function base64url(buff) {
  return buff.toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '')
}

function createIlpSecret(ledger, port) {
  return 'ilp_secret:v1:'+base64url(Buffer.from('http://' + ledger + ':token-' + port + '@localhost:' + port + '/rpc', 'ascii'))
}

// SENDER    peer.before.        SERVER        peer.after.       RECEIVER test.benchmark
//                ------>   :9001   
//                                                   ------> :9002
//                                      :9003 <------
//    :9004 <------

// usage: node ./benchmarker.js senderPort senderIlpSecret receiverPort receiverIlpSecret
// usage: node ./minimalForwarder.js senderPort senderIlpSecret receiverPort receiverIlpSecret
const base = parseInt(process.argv[2]) || 6000
console.log(`node ./benchmarker.js ${base+4} ${createIlpSecret('peer.before.', base+1)} ${base+2} ${createIlpSecret('peer.after.', base+3)} 100 10`)
console.log(`node ./minimalForwarder.js ${base+1} ${createIlpSecret('peer.before.', base+4)} ${base+3} ${createIlpSecret('peer.after.', base+2)}`)
