// Party Panda
// A controller which mediates a pandora playlist based on the opinions of a group of people.

var fs = require('fs'),
    ws = require('ws'),
    util = require('util'),
    http = require('http'),
    jade = require('jade'),
    express = require('express'),
    fibrous = require('fibrous');
MemoryStore = express.session.MemoryStore;

// LOAD SETTINGS
var settings;
if (fs.existsSync(__dirname + "/settings.json"))
{ settings = JSON.parse(fs.readFileSync(__dirname + "/settings.json"));
}
else
{ console.info("Warning: using default settings file");
  settings = JSON.parse(fs.readFileSync(__dirname + "/settings-default.json"));
}

// DATABASE CONTROLLER
database = new function Database()
{ upvotes = {};
  downvotes = {};
  this.settings = settings;
  this.storeVote = function storeVote(unique, vote)
  { if (vote == "down")
    { downvotes[unique] = true;
      delete upvotes[unique];
    }
    else if (vote == "up")
    { upvotes[unique] = true;
      delete downvotes[unique];
    }
  }
  this.getVote = function getVote(unique)
  { if (unique in upvotes) return "up";
    else if (unique in downvotes) return "down";
    else return;
  }
  this.resetVotes = function resetVotes()
  { upvotes = {};
    downvotes = {};
  }
  this.getConsensus = function getConsensus()
  { numUp = Object.keys(upvotes).length;
    numDown = Object.keys(downvotes).length;
    total = numUp + numDown;
    console.log("total votes: "+ total);
    if (total < settings.DEFAULT_MIN) return;
    else if (numUp / total >= .6) return "up";
    else if (numUp / total <= .3)
    { return "down";
    }
  }
}();

// 
function registerVote(session, vote)
{ if (session.token)
  { database.storeVote(session.token, vote);
    consensus = database.getConsensus();
    console.log("consensus: "+consensus);
    if (consensus)
    { console.log("consensus truthy");
      extensionWS.send("rating:"+consensus);
    }
  }
}


// SERVER AND EXPRESS SETUP
var app = new express();
var server = http.createServer(app);
var wsServer = new ws.Server({server: server});

var cookieParser = new express.cookieParser(settings.sessionSecret);
var sessionstore = new MemoryStore();
var sessionParser = new express.session({ key: "express.sid",
                                          // secret: settings.sessionSecret,
                                          store: sessionstore });
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
  { vote = database.getVote(req.session.token);
    res.send(jade.renderFile(__dirname + "/templates/index.jade", {"vote": vote}));
  }
  if (req.session.token)
  { send_page(req, res);
  }
  else;
  { // TODO: redo with plugins
    if (settings.LOGIN == "session")
    { req.session.token = req.session.id;
      req.session.save();
      send_page(req, res);
    }
    else if (settings.LOGIN == "codeday")
    { ret = encodeURIComponent("http://"+req.headers.host+"/login");
      res.redirect('http://codeday.org/oauth?token='+settings.codeDatappToken+'&return='+ret);
    }
    else
      res.error(503, "Invalid LOGIN");
  }
});
app.get('/login', function (req, res)
{ // TODO: verify code by accessing user's name on codeday.org
  if (req.query.code)
  { req.session.token = req.query.code;
    req.session.save();
  }
  console.log("logging in");
  res.redirect('/');
});
// API in place of websocket interface just in case
app.post('/vote/down', function (req, res)
{ registerVote(req.session, 'down');
  res.send(200);
});
app.post('/vote/up', function (req, res)
{ registerVote(req.session, 'up');
  res.send(200);
});

// WEBSOCKET LOGIC
function parse(message)
{ var originalMessage = message;
  var type;
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
           data: data,
           originalMessage: originalMessage
         };
}

var dummyWS = (
{ send : function dummysend(message)
  { // maybe reevaluate in a bit
    clients.send("reset:");
  }
});
var extensionWS;
function Clients()
{ self = {};
  this.add = function add(ws)
  { self[ws.upgradeReq.headers['sec-websocket-key']] = ws;
  }
  this.remove = function remove(ws)
  { delete self[ws.upgradeReq.headers['sec-websocket-key']];
  }
  this.broadcast = function broadcast(message)
  { for (key in self) self[key].send(message);
  }
}
var clients = new Clients();

function is_connection_from_extension(origin)
{ if (origin == "http://www.pandora.com") return true;
  origin = origin.split("//");
  return ( origin[0] == "chrome-extension:" &&
           ! ( settings.RESTRICT_CHROME_EXTENSION && origin[1] !=  settings.RESTRICT_CHROME_EXTENSION )
         );
}

wsServer.on('connection', function(ws) {
  if (is_connection_from_extension(ws.upgradeReq.headers.origin)) // extension
  { console.log("got connection from extension");
    ws.on('message', function(message) {
      message = parse(message);
      if (message.type == "update")
      { database.resetVotes();
        clients.broadcast(message.originalMessage);
      }
      else
        console.log("extraneous message from extension: " + JSON.stringify(message));
    });
    if (extensionWS) extensionWS.terminate();
    extensionWS = ws;
    database.resetVotes();
  }
  else // client
  { fibrous.run(function() // attatch session to socket
    { cookieParser.sync(ws.upgradeReq, null);
      var sessionID = ws.upgradeReq.signedCookies['express.sid'];
      session = sessionstore.sync.load(sessionID);
      ws.session = session;
    });
    ws.on('message', function(message)
    { message = parse(message);
      if (message.type == "vote")
      { registerVote(ws.session, message.data)
      }
      // else if (message == "test")
      // { ws.send("session:"+JSON.stringify(ws.session));
      // }
      else
        console.log("extraneous message from client: "+JSON.stringify(message));
    });
    ws.on('close', function()
    { clients.remove(ws);
    });
    // store websocket for broadcasting to it.
    clients.add(ws);
  }
});

// START SERVER
server.listen(process.env.PORT || settings.debugPort);
