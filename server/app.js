// Party Panda
// A controller which mediates a pandora playlist based on the opinions of a group of people.

var fs = require('fs'),
    ws = require('ws'),
    util = require('util'),
    http = require('http'),
    jade = require('jade'),
    express = require('express');
MemoryStore = express.session.MemoryStore;


if (fs.existsSync(__dirname + "/settings.json"))
{ var settings = JSON.parse(fs.readFileSync(__dirname + "/settings.json"));
}
else
{ console.info("using default settings file");
  var settings = JSON.parse(fs.readFileSync(__dirname + "/settings-default.json"));
}

function parse(message)
{ try
  { return JSON.parse(message);
  }
  catch (SyntaxError)
  { return message;
  }
}

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

/* server and express app setup*/

var app = new express();
var server = http.createServer(app);
var wss = new ws.Server({server: server});

var cookieParser = new express.cookieParser(settings.sessionSecret);
var sessionParser = new express.session({ key: "express.sid",
                                          // secret: settings.sessionSecret,
                                          store: new MemoryStore() });

//app.use(express.logger());
app.use(cookieParser);
app.use(sessionParser);

// static folders and files
app.use('/styles', express.static(__dirname + '/styles')); // local css
app.use('/scripts', express.static(__dirname + '/scripts')); // local js
app.use('/assets', express.static(__dirname + '/assets')); // images etc
app.use('/bower', express.static(__dirname + '/bower_components')); // bower components)


// app endpoints
app.get('/', function (req, res)
{ if (req.session.token)
  { vote = "";
    if (req.session.token in upvotes) vote = "up";
    if (req.session.token in downvotes) vote = "down";
    res.send(jade.renderFile(__dirname + "/templates/index.jade", {"vote": vote}));
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

//websocket logic

var mainWS;
wss.on('connection', function(ws) {
  if (ws.upgradeReq.headers.origin == "http://www.pandora.com")
  { mainWS && mainWS.terminate();
    mainWS = ws;
    console.log("got connection from extension");
    ws.on('message', function(message) {
      message = parse(message);
      if (message.type == "reset")
      { upvotes = {};
        downvotest = {};
      }
      else
        console.log("extraneous message from extension: "+message);
    });
  }
  else
  { ws.on('message', function(message)
    { message = parse(message);
      if (message.type == "vote")
      {
      }
      else
        console.log("extraneous message from client: "+message);
    });
  }
});

server.listen(process.env.PORT || settings.debugPort);