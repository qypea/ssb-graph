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

// Graph is a map of startId -> endId -> value where value signifies:
// null: no relationship, false: blocked, true: follows
var graph = {};

function graphPruneNulls() {
    for (start in graph) {
        var row = graph[start];
        for (end in row) {
            if (row[end] === null) {
                delete row[end];
            }
        }
    }
}

pull(sbot.friends.stream(),
    pull.drain(function (info) { graph = info; }, function() {
        // Work
        graphPruneNulls();
        console.log(graph);

        // Close out session, exit
        sbot.close(true);
        process.exit(0);
    }));
