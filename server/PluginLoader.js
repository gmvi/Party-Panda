var fs = require('fs');
// All this just to remove an unwieldly if/else block
module.exports = function PluginsLoader(dirname, plugin_id, required)
{ if (typeof(dirname) != 'string')
    throw new TypeError("dirname must be a string");
  if (typeof(plugin_id) != 'string')
    throw new TypeError("plugin_id must be a string");
  if (!required) required = [];
  var plugins = {}; // hash to hold plugin objects
  this.reload = function reload() // load plugins from the specified directory
  { var dir = fs.readdirSync(dirname);
    plugins = {};
    var plug;
    for (var i in dir)
    { var path_i_ = dirname+"/"+dir[i];
      var ends_js = dir[i].substring(dir[i].length-3) == '.js';
      var stats = fs.statSync(path_i_);
      if (stats.isDirectory())
      { // If a child of the specified directory is a directory, check inside it for a file called
        // plugin.js
        if (fs.existsSync(path_i_+"/plugin.js"))
        { dir[i] = "plugin.js"; // kinda hacky but it works
          path_i_ = path_i_+"/plugin.js";
          ends_js = true;
          stats = fs.statSync(path_i_);
        }
      }
      if (ends_js && stats.isFile() && dir[i].indexOf('.') > 1)
      { // Before requiring the plugin, we must first invalidate any entry in
        // the cache it may have.
        delete require.cache[require.resolve('./'+path_i_)];
        plug = require('./'+path_i_); // new require(path_i_, storage) ?
        // check loaded plugin for conformity to given specs.
        var missing_attrs = [];
        if (!plug[plugin_id])
          missing_attrs.push(plugin_id);
        for (var i in required)
          if (!plug[required[i]])
            missing_attrs.push(required[i]);
        if (missing_attrs.length)
        { console.log('error loading plugin `' + path_i_ + '`. ' +
                      'Plugin does not expose required attribute(s): (' +
                      missing_attrs + ').');
          continue;
        }
        // check that a plugin by the same name is not already loaded.
        if (plugins[plug[plugin_id]])
          console.log('error loading plugin `' + path_i_ + '`. ' +
                      'A plugin called "' + plug[plugin_id] + '" ' +
                      'already exists.');
        else
          plugins[plug[plugin_id]] = plug;
      }
    }
  }
  this.reload();
  this.get = function get(id)
  { return plugins[id];
  };
  this.all = function all()
  { return Object.keys(plugins);
  }
}