const Cli = require('matrix-appservice-bridge').Cli
const Bridge = require('matrix-appservice-bridge').Bridge
const AppServiceRegistration = require('matrix-appservice-bridge').AppServiceRegistration
const Client = require('cabal-client')
const req = require('require-yml')
const path = require('path')
const noop = () => {}

var bridge

let config = req(path.join(__dirname, 'config.yml'))

var client = new Client({
  config: {
    dbdir: config.dbdir || '/tmp/cabals'
  }
})

const MATRIX_ROOM_ID = config.matrix.room
const CABAL_CHANNEL = config.cabal.channel

var pendingCabals = config.cabal.keys.map(client.addCabal.bind(client))
Promise.all(pendingCabals).then(() => {
  var keys = client.getCabalKeys()
  keys.map((key) => {
    var cabal = client._getCabalByKey(key)
    cabal.publishNick(config.cabal.nickname, noop)
    var details = client.getDetails(cabal)
    details.on('new-message', ({ channel, author, message }) => {
      console.log(channel, author, message)
      if (channel !== CABAL_CHANNEL) return
      console.log('boot')
      if (author !== 'UCABALBOT') {
        var intent = bridge.getIntent('@cabal_' + author + `:${config.matrix.homeserver_url}`)
        intent.sendText(MATRIX_ROOM_ID, message)
      }
    })
  })
})

new Cli({
  registrationPath: 'cabal-registration.yaml',
  generateRegistration: function (reg, callback) {
    reg.setId(AppServiceRegistration.generateToken())
    reg.setHomeserverToken(AppServiceRegistration.generateToken())
    reg.setAppServiceToken(AppServiceRegistration.generateToken())
    reg.setSenderLocalpart('cabalbot')
    reg.addRegexPattern('users', '@cabal_.*', true)
    callback(reg)
  },
  run: function (port, matrixConfig) {
    bridge = new Bridge({
      homeserverUrl: config.matrix.homeserver_url,
      domain: 'localhost',
      registration: 'cabal-registration.yaml',
      controller: {
        onUserQuery: function (queriedUser) {
          return {} // auto-provision users with no additonal data
        },
        onEvent: function (request, context) {
          var event = request.getData()
          // replace with your room ID
          console.log(event)
          if (event.type !== 'm.room.message' || !event.content || event.room_id !== MATRIX_ROOM_ID) {
            return
          }
          var username = event.user_id
          client.publishMessage({
            type: 'chat/text',
            content: {
              text: `(${username}) ${event.content.body}`,
              channel: CABAL_CHANNEL
            }
          },
          function (err, res) {
            if (err) console.error('Error: %s', err)
            console.log('DONE')
          })
        }
      }
    })
    bridge.run(port, matrixConfig)
  }
}).run()
