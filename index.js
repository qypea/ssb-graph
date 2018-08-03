#!/bin/sh
':' // ; exec "$(command -v node || command -v nodejs)" "$0" "$@"
// http://unix.stackexchange.com/questions/65235/universal-node-js-shebang
// vi: ft=javascript

var pull = require('pull-stream');
var createSbot = require('scuttlebot')
    .use(require('scuttlebot/plugins/master'))
    .use(require('scuttlebot/plugins/gossip'))
    .use(require('scuttlebot/plugins/replicate'))
    .use(require('ssb-friends'));

var config = require('ssb-config/inject')();
var keys = require('ssb-keys')
    .loadOrCreateSync(require('path').join(config.path, 'secret'));

var sbot = createSbot({
    port: 45451,
    timeout: 2001,
    host: 'localhost',
    path: config.path,
    keys: keys,
});

pull(sbot.friends.stream(),
    pull.drain(function (info) {
            console.log("pull", info);
        }, function() {
            sbot.close(true);
            process.exit(0);
        }));
