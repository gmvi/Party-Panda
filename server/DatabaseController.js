Promise = require('es6-promise').Promise;
// wraps a callback fn such that it never gets called with more than one arg.
var erronly = function(resolve, reject)
{ return function erronly(err)
  { if (err != undefined) reject(err);
    else resolve();
  }
}
var std = function(resolve, reject)
{ return function std(err, result)
  { if (err != undefined) reject(err);
    else resolve(result);
  }
}
var bool = function(resolve, reject)
{ return function bool(err, result)
  { if (err != undefined) reject(err);
    else resolve(Boolean(result));
  }
}

module.exports = function DatabaseController(options)
{ var client = options.client;
  var default_settings = options.default_settings || undefined;
  if (client == undefined)
    throw new Error("DatabaseController options must include a redis client");
  this.clearAll = function clearAll()
  { return new Promise(function(resolve, reject)
    { client.flushdb(erronly(resolve, reject));
    });
  }
  this.close = function close()
  { return new Promise(function(resolve, reject)
    { client.quit(erronly(resolve, reject));
    });
  }

  // rooms
  function roomExists(room)
  { return new Promise(function(resolve, reject)
    { client.sismember('rooms', room, bool(resolve, reject));
    });
  }
  this.roomExists = roomExists;
  function checkRoomExists(room, promise_fn)
  { return roomExists(room).then(function(exists)
    { if (!exists) throw new TypeError("Room does not exist");
      return new Promise(promise_fn);
    });
  }
  this.createRoom = function createRoom(room, settings)
  { return this.roomExists(room).then(function(exists)
    { if (!room || exists) throw new TypeError("Can't create room");
      return new Promise(function(resolve, reject)
      { client.sadd("rooms", room, function(err, result)
        { if (err) reject(err);
          else 
          { settings = settings || default_settings;
            if (settings != undefined)
            { var fn = erronly(resolve, reject);
              client.hmset("room:"+room+".settings", settings, fn);
            }
            else resolve();
          }
        });
      });
    });
  }
  this.closeRoom = function closeRoom(room)
  { return checkRoomExists(room, function(resolve, reject)
    { var fn = erronly(resolve, reject);
      client.multi()
              .srem("rooms", room)
              .del("room:" + room + ".settings")
            .exec(fn);
    });
  }


  /* votes */

  // returns a Promise which gets the vote ["up"|"down"] for a specific unique
  // identifier.
  this.getVote = function getVote(room, unique)
  { return checkRoomExists(room, function(resolve, reject)
    { // get upvotes
      var up = new Promise(function(resolve, reject)
      { var fn = bool(resolve, reject);
        client.sismember("room:"+room+".up", unique, fn);
      });
      // get downvotes
      var down = new Promise(function(resolve, reject)
      { var fn = bool(resolve, reject);
        client.sismember("room:"+room+".down", unique, fn);
      });
      // after up and down return results, handle them
      return Promise.all([up, down]).then(function(results)
      { up = results[0];
        down = results[1];
        if (up)
        { if(down) reject(new Error("key in both upvote and downvote lists"));
          else resolve("up");
        }
        else if (down) resolve("down");
        else resolve(null);
      });
    });
  }
  this.storeVote = function storeVote(room, unique, vote)
  { return checkRoomExists(room, function(resolve, reject)
    { multi = client.multi();
      if (vote == "up")
        multi.sadd("room:"+room+".up", unique)
             .srem("room:"+room+".down", unique);
      else if (vote == "down")
        multi.sadd("room:"+room+".down", unique)
             .srem("room:"+room+".up", unique);
      else
        reject(new Error("vote must be 'up' or 'down'"));
      multi.exec(function()
      { client.scard("room:"+room+".up", function(err, upvotes)
        { client.scard("room:"+room+".down", function(err, downvotes)
          { resolve({"upvotes"   : upvotes,
                     "downvotes" : downvotes});
          });
        });
      });
    });
  }
  this.resetVotes = function resetVotes(room)
  { return checkRoomExists(room, function(resolve, reject)
    { var fn = erronly(resolve, reject);
      client.multi()
              .del("room:"+room+".up")
              .del("room:"+room+".down")
            .exec(fn);
    });
  }
  this.getNumUpvotes = function getNumUpvotes(room)
  { return checkRoomExists(room, function(resolve, reject)
    { var fn = std(resolve, reject);
      client.scard("room:"+room+".up", fn);
    });
  }
  this.getNumDownvotes = function getNumDownvotes(room)
  { return checkRoomExists(room, function(resolve, reject)
    { var fn = std(resolve, reject);
      client.scard("room:"+room+".down", fn);
    });
  }
  // settings
  this.getSetting = function getSetting(room, setting)
  { return checkRoomExists(room, function(resolve, reject)
    { var fn = std(resolve, reject);
      client.hget("room:"+room+".settings", setting, fn);
    });
  }
  this.getSettings = function getSettings(room, settings)
  { return checkRoomExists(room, function(resolve, reject)
    { var return_obj = {};
      var promises = Array(settings.length);
      for (var i in settings)
      { var setting = settings[i];
        promises[i] = new Promise(function(resolve, reject)
        { var fn = std(resolve, reject);
          client.hget("room:"+room+".settings", setting, fn);
        }).then(function(result)
        { return_obj[setting] = result;
        });
      }
      return Promise.all(promises).then(function()
      { resolve(return_obj);
      })
    });
  }
  this.setSetting = function setSetting(room, setting, value, fn)
  { return checkRoomExists(room, function(resolve, reject)
    { var fn = std(resolve, reject);
      client.hset("room:"+room+".settings", setting, value, fn);
    });
  }
}