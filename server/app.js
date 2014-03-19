// Party Panda
// A controller which mediates a pandora playlist based on the votes of a
// group of people.

var fs = require('fs'),
    ws = require('ws'),
    util = require('util'),
    http = require('http'),
    jade = require('jade'),
    redis = require('redis'),
    express = require('express'),
    fibrous = require('fibrous'), // can I remove this and replace with promises?
    Promise = require('es6-promise').Promise,
    PluginLoader = require('./PluginLoader.js'),
    MemoryDatabase = require('./database/MemoryDatabase.js'),
    RedisDatabase = require('./database/RedisDatabase.js');
var RedisStore = require('connect-redis')(express);
var MemoryStore = express.session.MemoryStore;

var usersystemPlugins = new PluginLoader("plugins", "name");

// LOAD SETTINGS
var settings;
if (fs.existsSync(__dirname + "/settings.json"))
{ settings = require("./settings.json");
}
else
{ console.info("Warning: using default settings file");
  settings = require("./settings-default.json");
}

// DATABASE CONTROLLER
var database;
if (settings.debug)
  database = new MemoryDatabase();
else
{ var redisClient = redis.createClient();
  database = new RedisDatabase(redisClient);
}

default_room_settings = { session : "session",
                          minVotes : settings['min votes'],
                          thresholdUp : settings['upvote threshold'],
                          thresholdDown : settings['downvote threshold']
                        };

var registerVote = function registerVote(room, unique, vote)
{ // ensure unique identifier exists
  var db_call = database.setVote(room, unique, vote);
  return db_call.then(function(upvotes, downvotes)
  { var total = upvotes+downvotes;
    settings_promise = database.getSettings(room, ['minVotes',
                                                   'thresholdUp',
                                                   'thresholdDown']);
    return settings_promise.then(function(room_settings)
    { if (total > room_settings.minVotes)
      { if (up/total >= room_settings.thresholdUp)
          wsclient.emitVote('up');
        else if (down/total <= room_settings.thresholdDown)
          wsclient.emitVote('down');
      }
    });
  }).error(function(err)
  { console.log("error registering vote from '"+unique+"' in room '"+room+"'");
    throw err;
  });
}


// SERVER AND EXPRESS SETUP
var app = new express();
var server = http.createServer(app);
var wsServer = new ws.Server({server: server});

var cookieParser = new express.cookieParser(settings['session secret']);
var sessionStore;
if (settings.debug)
  sessionStore = new MemoryStore();
else
var sessionParser = new express.session({ key: "express.sid",
                                          // secret: settings['session secret'],
                                          store: sessionStore });
//app.use(express.logger());
app.use(cookieParser);
app.use(sessionParser);

// static folders and files
app.use('/styles', express.static(__dirname + '/styles')); // local css
app.use('/scripts', express.static(__dirname + '/scripts')); // local js
app.use('/assets', express.static(__dirname + '/assets')); // images etc
app.use('/bower', express.static(__dirname + '/bower_components')); // bower components)


// APP ENDPOINTS
app.get('/', function (req, res)
{ function send_page(req, res)
  { vote = database.getVote(null, req.session.token);
    res.send(jade.renderFile(__dirname + "/templates/index.jade", {"vote": vote}));
  }
  if (usersystem.is_logged_in(req.session))
  { send_page(req, res);
  }
  else;
  { usersystem.request_login(req, res, "http://"+req.headers.host+"/login");
  }
});
app.get('/login', function (req, res)
{ // TODO: verify code by accessing user's name on codeday.org
  if (usersystem.accept_login(req))
  { console.log("logging in");
    res.redirect('/');
  }
  else
  { console.log("failed login attempt");
    res.redirect('/error?error=login');
  }
});
// API in place of websocket interface just in case
app.post('/vote/down', function (req, res)
{ if (usersystem.is_logged_in(req.session))
  { registerVote('main', req.session.token, 'down').then(function ()
    { res.send(200);
    });
  }
  else res.send(403);
});
app.post('/vote/up', function (req, res)
{ if (usersystem.is_logged_in(req.session))
  { registerVote('main', req.session.token, 'up').then(function ()
    { res.send(200);
    });
  }
  else res.send(403);
});

// TODO: reevalute the following for shift to multi-room system

// WEBSOCKET LOGIC
function parse(message)
{ var type;
  var data;
  if (1 + message.indexOf(":"))
  { message = message.split(":");
    try
    { message[1] = JSON.parse(message[1]);
    }
    catch (SyntaxError) { }
    type = message[0];
    data = message[1];
  }
  else
  { type = "message";
    data = message;
  }
  return { type: type,
           data: data
         };
}

// how do I do sessions with extension web sockets?
/// I register a room when I get an extension room creation request
/// I unregister a room when I lose an extension websocket
//// future: extension websocket heartbeats and timeout?
/// the redis database records the set of taken rooms
var wsPandoras = new function Pandoras()
{ clients = Object.create(null);
  this.add = function add(ws)
  { clients[ws.upgradeReq.headers['sec-websocket-key']] = ws;
  }
  this.remove = function remove(ws)
  { delete clients[ws.upgradeReq.headers['sec-websocket-key']];
  }
  this.broadcast = function broadcast(message)
  { for (key in clients) clients[key].send(message);
  }
}();
var wsClients = new function Clients()
{ clients = Object.create(null);
  this.add = function add(ws)
  { clients[ws.upgradeReq.headers['sec-websocket-key']] = ws;
  }
  this.remove = function remove(ws)
  { delete clients[ws.upgradeReq.headers['sec-websocket-key']];
  }
  this.broadcast = function broadcast(message)
  { for (key in clients) clients[key].send(message);
  }
  this.emitVote = function emitVote(vote)
  { }
}();

function is_connection_from_extension(origin)
{ if (origin == "http://www.pandora.com") return true;
  origin = origin.split("//");
  return ( origin[0] == "chrome-extension:" &&
           ! ( settings['restrict chrome extension'] &&
               origin[1] != settings['restrict chrome extension']
             )
         );
  // ^- obtuse way to say "if origin is an acceptable chome-extension (test) url"
}

wsServer.on('connection', function(ws) {
  if (is_connection_from_extension(ws.upgradeReq.headers.origin)) // extension
  { console.log("got connection from extension");
    ws.on('message', function(message) {
      message = parse(message);
      if (message.type == "update")
      { database.resetVotes(null);
        wsClients.broadcast(message.originalMessage);
      }
      else
        console.log("extraneous message from extension: " + JSON.stringify(message));
    });
    if (extensionWS) extensionWS.terminate();
    extensionWS = ws;
    database.resetVotes(null);
  }
  else // client
  { // TODO: reevaluate, maybe use Promises instead of fibrous?
    //       Why did I even use fibrous in the first place
    fibrous.run(function() // attatch session to socket
    { cookieParser.sync(ws.upgradeReq, null);
      var sessionID = ws.upgradeReq.signedCookies['express.sid'];
      session = sessionstore.sync.load(sessionID);
      ws.session = session;
    });
    ws.on('message', function(message)
    { message = parse(message);
      if (message.type == "vote")
      { registerVote(null, ws.session, message.data)
      }
      // else if (message == "test")
      // { ws.send("session:"+JSON.stringify(ws.session));
      // }
      else
        console.log("extraneous message from client: "+JSON.stringify(message));
    });
    ws.on('close', function()
    { wsClients.remove(ws);
    });
    // store websocket for broadcasting to it.
    wsClients.add(ws);
  }
});

// START SERVER
server.listen(process.env.PORT || settings['port']);
