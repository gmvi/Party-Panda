/* Party Panda
 *
 * A controller which mediates a pandora playlist based on the votes of a group
 * of people.
 */


//* IMPORTS

var fs = require('fs'),
    ws = require('ws'),
    http = require('http'),
    redis = require('redis'),
    express = require('express'),
    fakeredis = require('fakeredis'),
    es6_promise = require('es6-promise'),
    connect_redis = require('connect-redis');

var utils = require('./utils'),
    Usersystems = require('./Usersystems.js'),
    DatabaseController = require('./DatabaseController.js');

var Cookie = express.session.Cookie,
    Promise = es6_promise.Promise,
    Session = express.session.Session,
    RedisStore = connect_redis(express),
    MemoryStore = express.session.MemoryStore;


//** SETTINGS AND SETUP

var settings = utils.settings;
var debug = utils.logger;

var usersystems = new Usersystems({logger: debug});

function std_catch(res)
{ return function (err)
  { console.log((err && err.stack)
                || "error caught, but no stack found");
    if (res != undefined) res.send(500);
  }
}

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
                     thresholdDown : .3
                   };

var database = new DatabaseController({client:           client,
                                       default_settings: default_settings});

// TODO EVAL: after switch to redis's pub-sub
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
          extensionWS.send('vote:"up"');
        else if (relative_up <= room_settings.thresholdDown)
          extensionWS.send('vote:"down"');
      }
    })
  }).catch(function (err)
  { console.log("error registering vote from {0} in room {1}: {2}"
                .format(unique, room, vote));
    console.log(err.stack || err);
    throw err;
  });
}

//** SERVER AND EXPRESS SETUP
var app = new express();
var server = http.createServer(app);
var wsServer = new ws.Server({server: server});

app.use(express.favicon(__dirname + '/assets/favicon.ico'));

var parseCookie = express.cookieParser(settings['cookie secret']);
var loadSession = express.session({ key: "express.sid",
                                    store: sessionStore });
app.use(parseCookie);
app.use(loadSession);

// static folders and files
app.use('/styles',  express.static(__dirname + '/styles'));
app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/assets',  express.static(__dirname + '/assets'));
app.use('/bower',   express.static(__dirname + '/bower_components'));

// TODO EVAL: write a middleware layer to load usersystem?

//** APP ENDPOINTS

function roomMiddleware(req, res, next)
{ database.roomExists(req.params.room).then(function(exists)
  { if (!exists)
    { res.send(utils.render("not_found", {"room": req.params.room}));
    }
    else
    { return database.getSetting(req.params.room, "usersystem")
        .then(function (system_id)
      { req.usersystem = usersystems.get(system_id);
        next();
      });
    }
  }).catch(std_catch(res));
}

app.get('/:room', roomMiddleware, function (req, res)
{ var room_name = req.params.room;
  var view_vars = {"room": room_name};
  if (req.usersystem.is_logged_in(req))
  { database.getVote(room, req.session.token)
      .then(function (vote)
    { view_vars["vote"] = vote;
      res.send(utils.render("index", view_vars));
    }).catch(std_catch(res));
  }
  else
  { var redirect_url = "http://{0}/login".format(req.headers.host);
    usersystem.request_login(req, res, redirect_url);
  }
});
// TODO: multiroom
app.get('/:room/login', roomMiddleware, function (req, res)
{ if (req.usersystem.accept_login(req))
  { console.log("logging in");
    res.redirect('/');
  }
  else
  { console.log("failed login attempt");
    res.redirect('/error?error=login');
  }
});
app.get('/error', function (req, res)
{ res.send(500);
});

//** WEBSOCKET LOGIC

// temporary, until there are multiple rooms listening for redis pub/sub events
var extensionWS;

// object to handle broadcasting to connected clients
var wsClients = new function Clients()
{ rooms = Object.create(null);
  function get(room)
  { if (!(room in rooms))
      rooms[room] = Object.create(null);
    return rooms[room];
  }
  this.add = function add(ws)
  { if (!ws.room) debug("ERROR, added ws has no room");
    room = get(ws.room);
    room[ws.upgradeReq.headers['sec-websocket-key']] = ws;
  }
  this.remove = function remove(ws)
  { if (ws.room)
    { room = get(ws.room);
      delete room[ws.upgradeReq.headers['sec-websocket-key']];
    }
  }
  this.broadcast = function broadcast(room, message)
  { room = get(room);
    for (key in room)
      room[key].send(message);
  }
}();

wsServer.on('connection', function (ws)
{ new Promise(function ws_session(resolve, reject)
  { // attatch session to socket
    parseCookie(ws.upgradeReq, null, function load_session(err)
    { if (err) return reject(err);
      var sessionID = ws.upgradeReq.signedCookies['express.sid'];
      ws.sessionID = sessionID;
      sessionStore.get(sessionID, function attatch_session(err, session)
      { if (err) return reject(err);
        var fakeReq = {}
        fakeReq.sessionID = sessionID;
        fakeReq.sessionStore = sessionStore;
        if (!session)
        { ws.session = new Session(fakeReq);
          ws.session.cookie = new Cookie();
        }
        else
        { ws.session = sessionStore.createSession(fakeReq, session);
        }
        // save the session
        ws.session.resetMaxAge();
        ws.session.save(function(err)
        { if (err) reject(err);
          else resolve();
        });
      });
    });
  }).then(function ws_main()
  { // proxy send to extend life of session
    var send = ws.send;
    ws.send = function proxied_send()
    { ws.session.resetMaxAge();
      ws.session.save();
      send.apply(ws, arguments);
    }
    // categorize ws based on origin
    var from_extension = utils.is_from_extension(ws.upgradeReq.headers.origin);
    if (from_extension)
    { console.log("got connection from extension");
      setUpExtensionWS(ws);
    }
    else // from web client
    { console.log("connection from client");
      setUpClientWS(ws);
    }
  }).catch(std_catch());
});

function setUpExtensionWS(ws)
{ ws.on('message', function (message)
  { console.log("message from ex: "+message);
    var orig_message = message;
    message = utils.parseMessage(message);
    if (message.type == "check") // data is room name
    { var room_name = message.data;
      database.roomExists(room_name).then(function(result)
      { ws.send("check:"+JSON.stringify({ name: room_name,
                                           check: result}));
        // TODO: temporarily reserve room for this ws
      }).catch(function (err)
      { console.log(err.stack);
        ws.send('error:"check"');
      });
    }
    else if (message.type == "create") // data is room name
    { var room_name = message.data;
      if (ws.session.extension_room) // shouldn't happen, but might
      { database.closeRoom(ws.session.extension_room);
      }
      // doesn't have to be serialized; the old and new room won't collide.
      database.createRoom(room_name).then(function(was_created)
      { ws.session.extension_room = room_name;
        ws.send('create:'+JSON.stringify({ name: room_name,
                                           status: was_created }));
      }).catch(function(err)
      { console.log(err.stack);
        ws.send('error:"create"');
      });
    }
    else if (message.type == "change")
    { if (!ws.session.extension_room)
      { console.log("invalid change message from extension, no room open");
        ws.send('error:"not the owner of a room"');
        return;
      }
      // TODO: store song details to post on room webpages
      database.resetVotes(ws.session.extension_room)
        .then(function()
      { wsClients.broadcast(ws.session.extension_room, orig_message);
      }).catch(std_catch());
    }
    else 
      console.log("extraneous message from extension: "
                   + orig_message);
    // extend life of session
    ws.session.resetMaxAge();
    ws.session.save();
  });
  ws.on('close', function ()
  { if (ws.session.extension_room)
    { database.closeRoom(ws.session.extension_room)
        .catch(std_catch());
      ws.session.extension_room = null;
      ws.session.save();
    }
  });
}

function setUpClientWS(ws)
{ ws.on('message', function (message)
  { parsed = utils.parseMessage(message);
    if (parsed.type == "vote")
    { if (parsed.data !== "up" &&
          parsed.data !== "down")
        debug("bad vote from web client: {0}".format(parsed.data));
      else if (ws.room)
        registerVote(ws.room, ws.session.token, parsed.data)
          .catch(std_catch());
      else
        debug("web client didn't pick room first");
    }
    else if (parsed.type == "join")
    { database.roomExists(parsed.data).then(function(exists)
      { if (exists)
        { ws.room = parsed.data;
          return database.getSetting(ws.room, "usersystem")
            .then(function (system_id)
          { var usersystem = usersystems.get(system_id);
            var logged_in = usersystem.is_logged_in(ws.upgradeReq);
            if (logged_in)
            { ws.send("join:true");
            }
            else
            { ws.send('error:"login"');
              ws.close();
            }
          });
        }
        else
        { ws.send('error:"room"');
          ws.close();
        }
      });
    }
    else
      debug("extraneous message from web client: `{0}`".format(message));
    // extend life of session
    ws.session.resetMaxAge();
    ws.session.save();
  });
  ws.on('close', function ()
  { wsClients.remove(ws);
  });
}

// START SERVER
// TODO: remove database.clearAll
database.clearAll().then(function start_server()
{ var port = process.env.PORT || settings['port'];
  console.log("starting server on port {0}".format(port));
  server.listen(port);
}).catch(std_catch());
