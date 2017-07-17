const Oer = require('oer-utils')

const writer1 = new Oer.Writer()
writer1.writeUInt32(0)
writer1.writeUInt32(parseInt(process.argv[2]))
writer1.writeVarOctetString(Buffer.from(process.argv[3], 'ascii'))
writer1.writeVarOctetString(Buffer.from(process.argv[4], 'base64')); writer1.writeUInt8(0)
const writer2 = new Oer.Writer()
writer2.writeUInt8(1)
writer2.writeVarOctetString(writer1.getBuffer())
console.log(writer2.getBuffer().toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, ''))

// node ./createBaseTestTransfer.js 1 "test.benchmark" ""
// -> ARkAAAAAAAAAAQ50ZXN0LmJlbmNobWFyawAA
