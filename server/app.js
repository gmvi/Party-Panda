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
    Promise = require('es6-promise').Promise,
    connect_redis = require('connect-redis');

var utils = require('./utils'),
    DatabaseController = require('./DatabaseController.js');

var ExpressSession = require('express-session'),
    BodyParser = require('body-parser'),
    CookieParser = require('cookie-parser'),
    ServeFavicon = require('serve-favicon'),
    ServeStatic = require('serve-static');

var RedisStore = require('connect-redis')(ExpressSession);

//** VARIOUS SETUP AND UTILS

var settings = utils.settings;

function std_catch(res)
{ return function (err)
  { console.log((err && err.stack)
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

//** DATABASE CONTROLLER
var client;
var sessionStore;
if (settings.debug)
{ client = fakeredis.createClient();
  sessionStore = new ExpressSession.MemoryStore();
}
else
{ client = redis.createClient();
  sessionStore = new RedisStore({'client': client});
}

default_settings = { minVotes : 2,
                     thresholdUp : .6,
                     thresholdDown : .3
                   };

var database = new DatabaseController({client:           client,
                                       default_settings: default_settings});

// TODO EVAL: after switch to redis's pub-sub
var registerVote = function registerVote(room, unique, vote)
{ console.log(typeof room, room);
  return database.storeVote(room, unique, vote).then(function (votes)
  { var total = votes.upvotes + votes.downvotes;
    console.log("votes:", votes);
    return database.getSettings(room, ['minVotes',
                                       'thresholdUp',
                                       'thresholdDown'])
      .then(function (room_settings)
    { console.log("min votes:", room_settings.minVotes);
      if (total >= room_settings.minVotes)
      { var percent_up = votes.upvotes/total;
        console.log("percent_up:", percent_up);
        if (percent_up >= room_settings.thresholdUp)
          extensionWS.send('vote:"up"');
        else if (percent_up <= room_settings.thresholdDown)
          extensionWS.send('vote:"down"');
      }
    });
  }).catch(function (err)
  { console.log("error registering vote from {0} in room {1}: {2}"
                .format(unique, room, vote));
    console.log(err.stack || err);
    throw err;
  }).then(function()
  { console.log("success registering vote from {0} in room '{1}': {2}"
                .format(unique, room, vote));
  });
}


//** SERVER AND EXPRESS SETUP
var app = new express();
var server = http.createServer(app);
var io = require('socket.io')(server);

app.use(ServeFavicon(__dirname + '/assets/favicon.ico'));
app.set("view engine", "jade");
app.set("views", __dirname + '/templates');

var parseCookie = CookieParser(settings['cookie secret']);
var loadSession = ExpressSession({ key: "express.sid",
                                    store: sessionStore });
app.use(parseCookie);
app.use(loadSession);
app.use(BodyParser());

// static folders and files
app.use('/styles',  express.static(__dirname + '/styles'));
app.use('/scripts', express.static(__dirname + '/scripts'));
app.use('/assets',  express.static(__dirname + '/assets'));
app.use('/bower',   express.static(__dirname + '/bower_components'));

//** APP ENDPOINTS
app.get('/', function (req, res) {
  res.redirect('/asdf');
});

app.get('/login', function (req, res)
{ console.log(req.session);
  res.status(404).send('Not Implemented');
});

app.param('room', function(req, res, next, room)
{ res.locals.roomName = room;
  next();
});

app.get('/:room', function (req, res)
{ req.session.test = 5;
  if (req.session.user)
  { var user = req.session.user;
    database.getVote(req.params.room, req.session.user.token).then(function (vote)
    { res.render("index", {"vote": vote, 'user': true});
    }).catch(std_catch(res));
  } else {
    res.render('index', {'user': false});
  }
});

// HTTP API as well as websocket interface just in case

app.post('/api/vote', function (req, res)
{ if (!req.body.room)
  { return res.send(400, "param invalid: room");
  } else if (req.body.vote != 'up' && req.body.vote != 'down')
  { return res.send(400, "param invalid: vote");
  } else if (!req.session.user)
  { return res.send(400, "not logged in");
  }
  registerVote(req.body.room, req.session.user.token, req.body.vote)
    .then(res.send.bind(res, 200))
    .catch(res.send.bind(res, 500));
});

//// the Rooms object. This should be a separate module
// TODO tie in with database. I want to be able to restart the server seamlessly.
var Rooms = (function() {
  var rooms = Object.create(null); // hash map
  var hosts = Object.create(null); // map[string]
  function getRoom(id) {
    if (!(id in rooms)) {
      rooms[id] = Object.create(null);
    }
    return rooms[id];
  }
  return {
    open: function(id, socket)
    { hosts[id] = socket;
      clientNsp.to(id).emit('open');
    },
    close: function(id)
    { delete rooms[id];
      delete hosts[id];
      clientNsp.to(id).emit("close");
    },
    setName: function(id, name)
    { getRoom(id).name = name;
      clientNsp.to(id).emit('name', name);
    },
    updateTrack: function(id, track)
    { getRoom(id).track = track;
      console.log("updating track for ", id);
      clientNsp.to(id).emit('track', track);
    },
    join: function(roomID, socket)
    { socket.join(roomID);
      socket.emit('name', getRoom(roomID).name);
      socket.emit('track', getRoom(roomID).track);
      return {
        up: registerVote.bind(null, roomID, socket.sessionID, 'up'),
        down: registerVote.bind(null, roomID, socket.sessionID, 'down'),
      }
    },
    leave: function(id, socket)
    { socket.leave(id);
    },
  }
})();

//// Socket Stuff
// extension
var hostNsp = io.of('/host');
var clientNsp = io.of('/client');

hostNsp.on('connection', function(socket) {
  var currentRoomId = "";
  socket.on('new', function(id, name) {
    console.log('id', id);
    console.log('current', currentRoomId);
    if (currentRoomId) {
      Rooms.close(currentRoomId);
    }
    currentRoomId = id;
    Rooms.open(currentRoomId, socket);
    if (name) {
      Rooms.setName(currentRoomId, name);
    }
  });
  socket.on('track', function(data) {
    Rooms.updateTrack(currentRoomId, data);
  });
  socket.on('name', function(name) {
    Rooms.setName(currentRoomId, name);
  });
  socket.on('disconnect', function() {
    Rooms.close(currentRoomId);
  });
});

// web interface
clientNsp.on('connection', function(socket) {
  new Promise(function loadSessionID(resolve, reject)
  { parseCookie(socket.client.request, {}, function(){});
    loadSession(socket.client.request, {}, function() {
      socket.sessionID = socket.client.request.sessionID;
      resolve();
    });
  }).then(function()
  { var roomID;
    var controls;
    socket.on('join', function(id)
    { console.log("joining", id);
      if (roomID)
      { socket.emit('err', 'cannot join room twice');
      } else
      { roomID = id;
        console.log(roomID)
        console.log(typeof roomID, roomID);
        controls = Rooms.join(roomID, socket);
      }
    });
    socket.on('control', function(control, arg)
    { if (typeof controls == "object" && control in controls)
      { controls[control](arg);
      } else
      { socket.emit('err', 'control ' + control + ' does not exist');
      }
    });
    socket.on('disconnect', function() {
      Rooms.leave(roomID, socket);
    });
  });
});

// START SERVER
var port = process.env.PORT || settings['port'];
console.log("starting server on port {0}".format(port));
server.listen(port);
