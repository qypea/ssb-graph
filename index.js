#!/bin/sh
':' // ; exec "$(command -v node || command -v nodejs)" "$0" "$@"
// http://unix.stackexchange.com/questions/65235/universal-node-js-shebang
// vi: ft=javascript

var ssbKeys = require('ssb-keys')
var ssbServer = require('scuttlebot')
  .use(require('scuttlebot/plugins/master'))

var ssbClient = require('ssb-client')

var shsCap = 'XMHDXXFGBJvloCk8fOinzPkKMRqyA2/eH+3VyUr6lig='

var appName = process.env.appName
var config = require('ssb-config/inject')(appName)
var keys = require('ssb-keys')
    .loadOrCreateSync(require('path').join(config.path, 'secret'))

var server = ssbServer({
    port: 45451, timeout: 2001,
    temp: 'connect',
    host: 'localhost',
    master: keys.id,
    keys: keys,
    appKey: shsCap
})

function finish(client) {
    client.close(true)
    server.close(true)
    process.exit(0)
}

ssbClient(keys, { port: 45451, manifest: server.manifest(), caps: { shs: shsCap }}, function (err, client) {
    if (err) throw err

    client.whoami(function (err, info) {
        if (err) throw err

        console.log('whoami', info)
        finish(client)
    })
})
