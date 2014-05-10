var jade = require('jade');

//** STANDARD TYPE PROTOTYPE EXTENSIONS

// string.format replaces `{i}` in a string with the ith argument, if it exists
if (!String.prototype.format)
{ String.prototype.format = function format()
  { var args = arguments; // capture the arguments to format
    return this.replace(/{(\d+)}/g, function (match, number)
    { if (typeof args[number] != 'undefined')
        return args[number];
      else
        return match;
    });
  }
}


//** SETTINGS AND DEBUG-ONLY LOGGING
var settings;
try
{ settings = require("./settings.json");
}
catch (err)
{ console.info("Warning: using default settings file");
  settings = require("./settings-default.json");
}
this.settings = settings;

var logger;
if (settings.debug)
{ logger = function debug()
  { console.log.apply(console, arguments);
  }
}
else
{ logger = function pass() {}
}
this.logger = logger;


//** VIEWS
this.render = function render(template, variables)
{ var path = __dirname + "/templates/{0}.jade".format(template);
  return jade.renderFile(path, variables);
}


//** WEBSOCKET COMMUNICATION
this.is_from_extension = function is_from_extension(origin)
{ if (origin == "http://www.pandora.com") return true;
  if (settings.debug)
  { var protocol = origin.split("://")[0];
    return protocol == "chrome-extension";
  }
  return false;
}

// parser function for websocket messages
this.parseMessage = function parseMessage(message)
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


//** DEFINE EXPORTS
module.exports = this;