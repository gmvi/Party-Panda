Promise = require('es6-promise').Promise;
// wraps a callback fn such that it never gets called with more than one arg.
var erronly = function erronly(resolve, reject)
{ return function(err)
  { if (err) reject(err);
    else resolve();
  }
}
var std = function std(resolve, reject)
{ return function(err, result)
  { if (err) reject(err);
    else resolve(result);
  }
}

module.exports = new function MemoryDatabaseController(client, options)
{ // rooms
  this.roomExists = function roomExists(name)
  { return new Promise(function(resolve, reject)
    { client.sismember('rooms', name, std(resolve, reject));
    });
  }
  checkRoomExists = function checkRoomExists(name, promise_fn)
  { this.roomExists(name).then(function(exists)
    { if (!exists) throw new TypeError("Room does not exist");
      return new Promise(promise_fn);
    });
  }
  this.createRoom = function createRoom(name, settings)
  { return this.roomExists(name).then(function(exists)
    { if (!name || exists) throw new TypeError("Can't create room");
      return new Promise(function(resolve, reject)
      { var fn = erronly(resolve, reject);
        client.hmset("room:"+name+".settings", settings, fn);
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
      { var fn = std(resolve, reject);
        client.sismember("room:"+name+".up", unique, fn);
      });
      // get downvotes
      var down = new Promise(function(resolve, reject)
      { var fn = std(resolve, reject);
        client.sismember("room:"+name+".down", unique, fn);
      });
      // after up and down return results, handle them
      return Promise.all([up, down]).then(function(results)
      { up = results[0];
        down = results[1];
        if (up)
        { if(down) throw new Error("key in both upvote and downvote lists");
          else return "up";
        }
        else if (down) return "down";
        else return;
      });
    });
  }
  this.storeDownvote = function storeDownvote(name, unique)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = erronly(resolve, reject);
      client.multi()
              .sadd("room:"+name+".down", unique)
              .sremove("room:"+name+".up", unique)
            .exec(fn);
    });
  }
  this.storeUpvote = function storeUpvote(name, unique)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = erronly(resolve, reject);
      client.multi()
              .sadd("room:"+name+".up", unique)
              .sremove("room:"+name+".down", unique)
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
    { var fn = erronly(resolve, reject);
      client.scard("room:"+name+".up", fn);
    });
  }
  this.getNumDownvotes = function getNumDownvotes(name)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = erronly(resolve, reject);
      client.scard("room:"+name+".down", fn);
    });
  }
  // settings
  this.getSetting = function getSetting(name, setting)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = erronly(resolve, reject)
      client.hget("room:"+name+".settings", setting, fn);
    });
  }
  this.setSetting = function setSetting(name, setting, value, fn)
  { return checkRoomExists(name, function(resolve, reject)
    { var fn = erronly(resolve, reject)
      client.hset("room:"+name+".settings", setting, value, fn);
    });
  }
}();