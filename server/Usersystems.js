var fs = require('fs'),
    utils = require('./utils.js');

module.exports = function Usersystems(options)
{ options = options || {}
  var logger = options.logger || function pass() {};
  function log(message)
  { logger('| '+message);
  }
  var required = {'is_logged_in': 'function',
                  'request_login': 'function',
                  'accept_login': 'function',
                  'unique': 'function',
                  'name': 'string'}
  var plugins = {}; // hash to hold plugin objects
  this.reload = function reload() // load plugins from the specified directory
  { log('loading plugins');
    dirname = __dirname+"/usersystems"
    var dir = fs.readdirSync(dirname);
    for (var i in plugins) delete plugins[i];
    var plug;
    for (var i in dir)
    { var filename = dir[i];
      if (filename.indexOf('.') == 0)
      { log("skipping {0} (starts with .)".format(filename));
        continue;
      }
      var path = dirname+"/"+filename;
      var stats = fs.statSync(path);
      var ends_js;
      if (stats.isDirectory())
      { filename += "/";
        path += "/";
        // If a child of the usersystems directory is a directory, check inside
        // it for a file called plugin.js
        if (!fs.existsSync(path+"plugin.js"))
        { log("skipping {0} (no plugin.js)".format(filename));
          continue;
        }
        ends_js = true;
        path += "plugin.js";
        stats = fs.statSync(path);
      }
      else
        ends_js = filename.substring(filename.length-3) == '.js';

      if (!ends_js)
      { log("skipping {0} (not js)".format(filename));
        continue;
      }
      if (!stats.isFile())
      { log("skipping {0} (not a file)".format(filename));
        continue;
      }
      // Before require()-ing the plugin, we must first invalidate any entry in
      // the cache it may have. Note that path is an absolute path (by virtue
      // of `__dirname == require.resolve(".")`), so we don't need to
      // `require.resolve(path)`.
      delete require.cache[path];
      plug = require(path);
      if (typeof plug != 'object')
      { log("plugin at usersystems/{0} is not an object"
            .format(filename));
        continue;
      }
      // check that a plugin by the same name is not already loaded.
      if (plug['name'] in plugins)
      { log('error loading plugin at usersystems/{0}, '.format(filename))
        log('  a plugin with same identifier already exists');
        continue;
      }
      // check loaded plugin for conformity to specs.
      var valid = true;
      for (var i in required)
      { var attr = plug[i];
        if (!attr)
        { log("plugin at usersystems/{0} is missing attribute '{1}'"
              .format(filename, i));
          valid = false;
        }
        else if (typeof attr != required[i])
        { log("attribute '{1}' of plugin '{0}' is not of type '{2}'"
              .format(filename, i, required[i]));
          valid = false;
        }
      }
      if (!valid) continue;
      plugins[plug['name']] = plug;
    }
    log('done loading plugins');
  }
  this.reload();
  this.get = function get(id)
  { if (!(id in plugins))
      throw new Error("couldn't find plugin named {0}".format(id));
  };
  this.all = function all()
  { return Object.keys(plugins);
  }
}