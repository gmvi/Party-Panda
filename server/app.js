/* Party Panda
 *
 * A controller which mediates a pandora playlist based on the votes of a group
 * of people.
 */


//* IMPORTS

var fs = require('fs'),
    ws = require('ws'),
    http = require('http'),
    jade = require('jade'),
    redis = require('redis'),
    express = require('express'),
    fakeredis = require('fakeredis');

var Promise = require('es6-promise').Promise,
    PluginLoader = require('./PluginLoader.js'),
    DatabaseController = require('./DatabaseController.js');

var Cookie = express.session.Cookie,
    Session = express.session.Session,
    MemoryStore = express.session.MemoryStore,
    RedisStore = require('connect-redis')(express);

//** VARIOUS SETUP AND UTILS

var usersystems = new PluginLoader("usersystems", {id: "name"});

function std_catch(res)
{ return function (err)
  { console.log((typeof(err) == "object" && err.stack)
                || "error caught, but no stack found");
    if (res != undefined) res.send(500);
  }
}


//** STANDARD TYPE PROTOTYPE EXTENSIONS

// string.format replaces `{i}` in a string with the ith argument, if it exists
if (!String.prototype.format)
{ String.prototype.format = function format()
  { var args = arguments; // capture the arguments to format()
    return this.replace(/{(\d+)}/g, function (match, number)
    { if (typeof args[number] != 'undefined')
        return args[number];
      else return match;
    });
  };
}


//** SETTINGS

var settings;
try
{ settings = require("./settings.json");
}
catch (err)
{ console.info("Warning: using default settings file");
  settings = require("./settings-default.json");
}

var debug;
if (settings.debug) debug = function debug()
{ console.log.apply(console, arguments);
}
else debug = function pass() {}


//** DATABASE CONTROLLER
var client;
var sessionStore;
if (settings.debug)
{ client = fakeredis.createClient();
  sessionStore = new MemoryStore();
}
else
{ client = redis.createClient();
  sessionStore = new RedisStore({'client': client});
}

default_settings = { usersystem : "session",
                     minVotes : 2,
                     thresholdUp : .6,
                     thresholdDown : .4
                   };

var database = new DatabaseController({client:           client,
                                       default_settings: default_settings});

// TODO: re-evalutate after switch to redis's pub-sub
var registerVote = function registerVote(room, unique, vote)
{ return database.storeVote(room, unique, vote).then(function (votes)
  { var total = votes.upvotes + votes.downvotes;
    debug("votes:", votes);
    return database.getSettings(room, ['minVotes',
                                       'thresholdUp',
                                       'thresholdDown'])
      .then(function (room_settings)
    { debug("min votes:", room_settings.minVotes);
      if (total >= room_settings.minVotes)
      { var relative_up = votes.upvotes/total;
        debug("meter:", relative_up);
        if (relative_up >= room_settings.thresholdUp)
          wsClients.emitVote("null", 'up');
        else if (relative_up <= room_settings.thresholdDown)
          wsClients.emitVote("null", 'down');
      }
    })
  }).catch(function (err)
  { console.log("error registering vote from {0} in room {1}: {2}"
                .format(unique, room, vote));
    console.log(err);
    throw err;
  });
}


//** TEMPLATES
function render(template, variables)
{ var path = __dirname + "/templates/{0}.jade".format(template);
  return jade.renderFile(path, variables);
}


//** SERVER AND EXPRESS SETUP
var app = new express();
var server = http.createServer(app);
var wsServer = new ws.Server({server: server});

app.use(express.favicon(__dirname + '/assets/favicon.ico'));

var parseCookie = express.cookieParser(settings['cookie secret']);
var session = express.session({ key: "express.sid",
                                store: sessionStore });
app.use(parseCookie);
app.use(session);

// static folders and files
app.use('/styles',  express.static(__dirname + '/styles'));
app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/assets',  express.static(__dirname + '/assets'));
app.use('/bower',   express.static(__dirname + '/bower_components'));


//** APP ENDPOINTS
app.get('/', function (req, res)
{ database.getSetting("null", "usersystem").then(function (usersystem_name)
  { usersystem = usersystems.get(usersystem_name);
    if (usersystem.is_logged_in(req))
    { database.getVote("null", req.session.token).then(function (vote)
      { res.send(render("index", {"vote": vote}));
      }).catch(std_catch(res));
    }
    else
    { var redirect = "http://"+req.headers.host+"/login";
      usersystem.request_login(req, res, redirect);
    }
  }).catch(std_catch(res));
});
app.get('/login', function (req, res)
{ database.getSetting("null", "usersystem").then(function (usersystem_name)
  { var usersystem = usersystems.get(usersystem_name);
    if (usersystem.accept_login(req))
    { console.log("logging in");
      res.redirect('/');
    }
    else
    { console.log("failed login attempt");
      res.redirect('/error?error=login');
    }
  }).catch(std_catch(res));
});
app.get('/error', function (req, res)
{ res.send(500);
});

// HTTP API as well as websocket interface just in case
app.post('/vote/down', function (req, res)
{ database.getSetting("null", "usersystem").then(function (usersystem_name)
  { var usersystem = usersystems.get(usersystem_name);
    if (usersystem.is_logged_in(req))
    { registerVote('null', req.session.token, 'down')
        .then(res.send.bind(res, 200))
        .catch(res.send.bind(res, 500));
    }
    else res.send(403);
  }).catch(std_catch(res));
});
app.post('/vote/up', function (req, res)
{ if (usersystem.is_logged_in(req))
  { registerVote('null', req.session.token, 'up')
      .then(res.send.bind(res, 200))
      .catch(res.send.bind(res, 500));
  }
  else res.send(403);
});


//** WEBSOCKET LOGIC

// object to handle broadcasting to connected clients
var wsClients = new function Clients()
{ rooms = Object.create(null);
  function get(room)
  { if (!(room in rooms))
      rooms[room] = Object.create(null);
    return rooms[room];
  }
  this.add = function add(room, ws)
  { room = get(room);
    if (ws.upgradeReq.headers['sec-websocket-key'] in room)
      throw new Error("multiple connections from same session");
    room[ws.upgradeReq.headers['sec-websocket-key']] = ws;
  }
  this.remove = function remove(room, ws)
  { room = get(room);
    delete room[ws.upgradeReq.headers['sec-websocket-key']];
  }
  this.broadcast = function broadcast(room, message)
  { room = get(room);
    for (key in room)
      room[key].send(message);
  }
  this.emitVote = function emitVote(room, vote)
  { debug("sending vote: " + vote);
    this.broadcast(room, "consensus:"+vote);
  }
}();

// parser function for websocket messages
function parseMessage(message)
{ var type;
  var data;
  var i = message.indexOf(":");
  if (1 + i)
  { type = message.substring(0, i);
    data = message.substring(i+1);
    try
    { data = JSON.parse(data);
    }
    catch (err) { /* body is not valid JSON */ }
  }
  else
  { type = "message";
    data = message;
  }
  return { type: type,
           data: data
         };
}

// TODO: extension websocket heartbeats and timeout?
// the redis database records the set of taken rooms
// for scaling past one process, we will use redis's pub-sub system


function is_from_extension(origin)
{ if (origin == "http://www.pandora.com") return true;
  if (settings.debug)
  { var protocol = origin.split("://")[0];
    return protocol == "chrome-extension";
  }
  return false;
}

wsServer.on('connection', function (ws)
{ new Promise(function (resolve, reject)
  { // attatch session to socket
    parseCookie(ws.upgradeReq, null, function load_session(err)
    { if (err) return reject(err);
      var sessionID = ws.upgradeReq.signedCookies['express.sid'];
      ws.upgradeReq.sessionID = sessionID;
      ws.upgradeReq.sessionStore = sessionStore;
      sessionStore.get(sessionID, function attatch_session(err, session)
      { if (err) return reject(err);
        if (!session)
        { ws.upgradeReq.session = new Session(ws.upgradeReq);
          ws.upgradeReq.session.cookie = new Cookie();
        }
        else
        { sessionStore.createSession(ws.upgradeReq, session);
        }
        // save the session
        ws.upgradeReq.session.resetMaxAge();
        ws.upgradeReq.session.save(function(err)
        { if (err) reject(err);
          else resolve();
        });
      });
    });
  }).then(function ()
  { // check if ws is from a logged-in user
    var promise = database.getSetting("null", "usersystem")
    return promise.then(function (usersystem_name)
    { var usersystem = usersystems.get(usersystem_name);
      return usersystem.is_logged_in(ws.upgradeReq);
    });
  }).then(function (logged_in)
  { // throw out ws if not logged in
    if (!logged_in)
    { ws.send("error:\"not logged in\"");
      ws.close();
      return;
    }
    // proxy send to extend life of session
    var send = ws.send;
    ws.send = function proxied_send()
    { ws.upgradeReq.session.resetMaxAge();
      ws.upgradeReq.session.save();
      send.apply(ws, arguments);
    }
    // categorize ws based on origin
    var from_extension = is_from_extension(ws.upgradeReq.headers.origin);
    if (from_extension)
    { console.log("got connection from extension");
      ws.on('message', function (message)
      { var orig_message = message;
        message = parseMessage(message);
        if (message.type == "start")
        { //?
        }
        else if (message.type == "new_song")
        { // TODO: handle song update
          database.resetVotes("null")
                  .catch(std_catch());
          wsClients.broadcast("null", orig_message);
        }
        else if (message.type == "close")
        { // TODO: handle room close
        }
        else
          console.log("extraneous message from extension: "
                       + orig_message);
        // extend life of session
        ws.upgradeReq.session.resetMaxAge();
        ws.upgradeReq.session.save();
      });
      ws.send("ready"); // necessary?
    }
    else // from web client
    { console.log("connection from client");
      ws.on('message', function (message)
      { parsed = parseMessage(message);
        if (parsed.type == "vote")
        { if (parsed.data !== "up" &&
              parsed.data !== "down")
            debug("bad vote from web client: {0}".format(parsed.data));
          else
            registerVote("null", ws.upgradeReq.session.token, parsed.data)
        }
        else
          debug("extraneous message from web client: `{0}`".format(message));
        // extend life of session
        ws.upgradeReq.session.resetMaxAge();
        ws.upgradeReq.session.save();
      });
      ws.on('close', function ()
      { wsClients.remove("null", ws);
      });
      // store websocket for broadcasting to it.
      wsClients.add("null", ws);
    }
  }).catch(std_catch());
});

database.clearAll().then(function create_single_room()
{ return database.createRoom('null');
}).then(function start_server()
{ // START SERVER
  var port = process.env.PORT || settings['port'];
  console.log("starting server on port {0}".format(port));
  server.listen(port);
}).catch(std_catch());
