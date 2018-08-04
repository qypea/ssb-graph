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

// Prune the graph structure above of any null/false entries
function graphPrune() {
    for (start in graph) {
        var row = graph[start];
        for (end in row) {
            if (row[end] === null || row[end] === false) {
                delete row[end];
            }
        }
    }
}

// Append the next hop from the graph to a set of nodes and a set of relationships
// @param nodes set of nodes already known
// @param relationships list of relationships(start, end)
// @return Same as arguments
function graphNextHop(nodes, relationships) {
    var newNodes = [];
    var newRelationships = [];

    for(var i = 0, size = nodes.length; i < size ; i++){
        var node = nodes[i];

        var followed = graph[node];
        if (followed === undefined) {
            continue;
        }

        for (follow in followed) {
            newRelationships.push([node, follow]);
            newNodes.push(follow);
        }
    }

    return [nodes.concat(newNodes), relationships.concat(newRelationships)];
}

// Return the nodes, relationships within a certain number of hops of a root
function graphHops(root, hops) {
    var nodes = [root];
    var relationships = [];

    for (var i = 0; i < hops; i++) {
        var ret = graphNextHop(nodes, relationships);
        nodes = ret[0];
        relationships = ret[1];
    }
    return [nodes, relationships];
}

var aliases = {};
var nextAlias = 0;

// Return the alias for a node id
function alias(node) {
    if (node in aliases) {
        return aliases[node];
    } else {
        var next = nextAlias++;
        aliases[node] = next;
        return next;
    }
}

// Return the array of aliases for an array of node ids
function aliasArray(nodes) {
    var ret = [];

    for(var i = 0, size = nodes.length; i < size ; i++) {
        var node = nodes[i];
        ret.push(alias(node));
    }
    return ret;
}

// Same as aliasArray except an array of arrays
function aliasArrayArray(nodes) {
    var ret = [];

    for(var i = 0, size = nodes.length; i < size ; i++) {
        var node = nodes[i];
        ret.push(aliasArray(node));
    }
    return ret;
}

// Print a graph in graphviz digraph format
// Takes in an array of 2-item arrays(source and dest)
function printGraph(relationships) {
    console.log('digraph "graph" {');
    for(var i = 0, size = relationships.length; i < size ; i++) {
        var rel = relationships[i];
        console.log(rel[0] + " -> " + rel[1]);
    }
    console.log('}');
}

pull(sbot.friends.stream(),
    pull.drain(function (info) { graph = info; }, function() {
        // Work
        graphPrune();

        var ret = graphHops(keys.id, 2);
        var nodes = ret[0];
        var relationships = ret[1];

        printGraph(aliasArrayArray(relationships));

        // Close out session, exit
        sbot.close(true);
        process.exit(0);
    }));
