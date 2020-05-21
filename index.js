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
console.log(config.cabal.nickname, 'listening on', CABAL_CHANNEL, MATRIX_ROOM_ID)
const homeserver_shortname = config.matrix.homeserver_url.replace('https://', '')

client.addCabal(config.cabal.key).then(() => {
  console.log(config.cabal.key)
  var cabal = client._getCabalByKey(config.cabal.key)
  cabal.publishNick(config.cabal.nickname, noop)
  var details = client.getDetails(cabal)
  details.on('new-message', ({ channel, author, message }) => {
    if (channel !== CABAL_CHANNEL) return
    if (author.name !== config.cabal.nickname) {
      var intent = bridge.getIntent('@cabal_' + author.name + `:${homeserver_shortname}`)
      intent.sendText(MATRIX_ROOM_ID, message.value.content.text)
    }
  })

  setupMatrix()
}).catch((err) => {
  console.error(err)
})

function setupMatrix () {
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
            if (event.type !== 'm.room.message' || !event.content || event.room_id !== MATRIX_ROOM_ID) {
              return
            }
            var username = event.user_id
            var cabal = client._getCabalByKey(config.cabal.key)
            var details = client.getDetails(cabal)
            details.publishMessage({
              type: 'chat/text',
              content: {
                text: `${username.replace(':' + homeserver_shortname, '')}: ${event.content.body}`,
                channel: CABAL_CHANNEL
              }
            },
            function (err, res) {
              if (err) console.error('Error: %s', err)
            })
          }
        }
      })
      bridge.run(port, matrixConfig)
    }
  }).run()
}
