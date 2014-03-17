Promise = require('es6-promise').Promise;
// wraps a callback fn such that it never gets called with more than one arg.
var erronly = function(resolve, reject)
{ return function erronly(err)
  { if (err) reject(err);
    else resolve();
  }
}
var std = function(resolve, reject)
{ return function std(err, result)
  { if (err) reject(err);
    else resolve(result);
  }
}
var bool = function(resolve, reject)
{ return function bool(err, result)
  { if (err) reject(err);
    else resolve(Boolean(result));
  }
}

module.exports = function RedisDatabaseController(client, options)
{ this.clearAll = function clearAll()
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
  function roomExists(name)
  { return new Promise(function(resolve, reject)
    { client.sismember('rooms', name, bool(resolve, reject));
    });
  }
  this.roomExists = roomExists;
  function checkRoomExists(name, promise_fn)
  { return roomExists(name).then(function(exists)
    { if (!exists) throw new TypeError("Room does not exist");
      return new Promise(promise_fn);
    });
  }
  this.createRoom = function createRoom(name, settings)
  { return this.roomExists(name).then(function(exists)
    { if (!name || exists) throw new TypeError("Can't create room");
      return new Promise(function(resolve, reject)
      { client.sadd("rooms", name, function(err, result)
        { if (err) reject(err);
          else if (settings != undefined)
          { var fn = erronly(resolve, reject);
            client.hmset("room:"+name+".settings", settings, fn);
          }
          else resolve();
        });
      });
    });
  }
  this.closeRoom = function closeRoom(name)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = erronly(resolve, reject);
      client.multi()
              .srem("rooms", name)
              .del("room:" + name + ".settings")
            .exec(fn);
    });
  }


  /* votes */

  // returns a Promise which gets the vote ["up"|"down"] for a specific unique
  // identifier.
  this.getVote = function getVote(name, unique)
  { return checkRoomExists(name, function(resolve, reject)
    { // get upvotes
      var up = new Promise(function(resolve, reject)
      { var fn = bool(resolve, reject);
        client.sismember("room:"+name+".up", unique, fn);
      });
      // get downvotes
      var down = new Promise(function(resolve, reject)
      { var fn = bool(resolve, reject);
        client.sismember("room:"+name+".down", unique, fn);
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
  this.storeDownvote = function storeDownvote(name, unique)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = erronly(resolve, reject);
      client.multi()
              .sadd("room:"+name+".down", unique)
              .srem("room:"+name+".up", unique)
            .exec(fn);
    });
  }
  this.storeUpvote = function storeUpvote(name, unique)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = erronly(resolve, reject);
      client.multi()
              .sadd("room:"+name+".up", unique)
              .srem("room:"+name+".down", unique)
            .exec(fn);
    });
  }
  this.resetVotes = function resetVotes(name)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = erronly(resolve, reject);
      client.multi()
              .del("room:"+name+".up")
              .del("room:"+name+".down")
            .exec(erronly(fn));
    });
  }
  this.getNumUpvotes = function getNumUpvotes(name)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = std(resolve, reject);
      client.scard("room:"+name+".up", fn);
    });
  }
  this.getNumDownvotes = function getNumDownvotes(name)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = std(resolve, reject);
      client.scard("room:"+name+".down", fn);
    });
  }
  // settings
  this.getSetting = function getSetting(name, setting)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = std(resolve, reject)
      client.hget("room:"+name+".settings", setting, fn);
    });
  }
  this.setSetting = function setSetting(name, setting, value, fn)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = std(resolve, reject)
      client.hset("room:"+name+".settings", setting, value, fn);
    });
  }
}