// Party Panda
// A controller which mediates a pandora playlist based on the opinions of a group of people.

var fs = require('fs'),
    ws = require('ws'),
    util = require('util'),
    http = require('http'),
    jade = require('jade'),
    express = require('express');
MemoryStore = express.session.MemoryStore;


if (fs.existsSync("./settings.json"))
{ var settings = JSON.parse(fs.readFileSync("./settings.json"));
}
else
{ console.info("using default settings file");
  var settings = JSON.parse(fs.readFileSync("./settings-default.json"));
}


/* express app */

var app = new express();

var cookieParser = new express.cookieParser(settings.sessionSecret);
var sessionParser = new express.session({ key: "express.sid",
                                          // secret: settings.sessionSecret,
                                          store: new MemoryStore() });
app.configure(function()
{ app.use(cookieParser);
  app.use(sessionParser);
});

// static folders and files
app.use('/styles', express.static(__dirname + '/styles')); // local css
app.use('/scripts', express.static(__dirname + '/scripts')); // local js
app.use('/assets', express.static(__dirname + '/assets')); // images etc
app.use('/bower', express.static(__dirname + '/bower_components')); // bower components)

// state
upvotes = {};
downvotes = {};
MIN = 1;
getVote = function()
{ numUp = Object.keys(upvotes).length;
  numDown = Object.keys(downvotes).length;
  total = numUp + numDown;
  console.log("total: "+ total);
  if (total < MIN) return;
  if (numUp / total >= .6) return "up";
  if (numUp / total <= .3)
  { upvotes = {};
    downvotes = {};
    return "down";
  }
}

//websocket
var WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({host: "localhost", port: 5002});

var mainWS;
wss.on('connection', function(ws) {
  ws.on('message', function(message) {
    if (message == settings.extensionSecret)
    { if(mainWS != ws)
      { mainWS && mainWS.terminate();
        mainWS = ws;
        console.log("got connection from extension");
      }
    }
    else if (message == "reset")
    { upvotes = {};
      downvotest = {};
    }
  });
});

// app endpoints
app.get('/', function (req, res)
{ if (req.session.token)
  { vote = "";
    if (req.session.token in upvotes) vote = "up";
    if (req.session.token in downvotes) vote = "down";
    res.send(jade.renderFile("./templates/index.jade", {"vote": vote}));
  }
  else
  { ret = encodeURIComponent("http://"+req.headers.host+"/login");
    res.redirect('http://codeday.org/oauth?token='+settings.appToken+'&return='+ret);
  }
});
app.get('/login', function (req, res)
{ if (req.query.code)
    req.session.token = req.query.code;
  res.redirect('/');
});
app.post('/vote/down', function (req, res)
{ if (req.session.token)
  { downvotes[req.session.token] = true;
    delete upvotes[req.session.token];
  }
  vote = getVote();
  console.log('vote: '+ vote);
  if (vote) mainWS.send(vote);
  res.send(200);
});
app.post('/vote/up', function (req, res)
{ if (req.session.token)
  { upvotes[req.session.token] = true;
    delete downvotes[req.session.token];
  }
  vote = getVote();
  console.log('vote: '+ vote);
  if (vote) mainWS.send(vote);
  res.send(200);
});
app.get('/test', function (req, res)
{ res.write('Your session id is ' + req.sessionID);
  req.session.count = ++req.session.count || 1;
  res.write('\nCount: ' + req.session.count);
  res.end();
});

var server = http.createServer(app);

server.listen(process.env.PORT || settings.debugPort);