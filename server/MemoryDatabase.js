Promise = require('es6-promise').Promise;

var a = new TypeError("Vote must be 'up' or 'down'.");

// DatabaseControllers should return Promises which resolve to the requested
// item, or which resolve after storing the specified item.
module.exports = function MemoryDatabaseController(options)
{ var rooms = Object.create(null); // clean object;
                                   // does not inherit from Object.prototype
  // rooms
  this.roomExists = function roomExists(name)
  { // probably not worth the overhead to set up a full Promise
    if (!name) return Promise.reject(new TypeError("Empty room identifier"));
    return Promise.resolve(name in rooms);
  }
  this.checkRoomExists = function checkRoomExists(name, promise_fn)
  { return this.roomExists(name).then(function(exists)
    { if (!exists) throw new TypeError("Room does not exist");
      return new Promise(promise_fn);
    });
  }
  this.createRoom = function createRoom(name, settings)
  { return this.roomExists(name).then(function(exists)
    { if (exists) return Promise.reject(new TypeError("Room already exists"));
      rooms[name] = { name: name,
                      upvotes: Object.create(null),
                      downvotes: Object.create(null),
                      settings: settings || {} // doesn't need to be clean;
                                               // doesn't store user input.
                    };
    });
  }
  this.closeRoom = function closeRoom(name)
  { return this.checkRoomExists(name, function(resolve)
    { delete rooms[name];
      resolve();
    });
  }

  // votes
  this.getVote = function getVote(name, unique)
  { return this.checkRoomExists(name, function(resolve)
    { room = rooms[name];
      if (unique in room.upvotes) resolve("up");
      else if (unique in room.downvotes) resolve("down");
      else resolve();
    });
  }
  this.storeDownvote = function storeDownvote(name, unique)
  { return this.checkRoomExists(name, function(resolve)
    { room = rooms[name];
      room.downvotes[unique] = true;
      delete room.upvotes[unique];
      resolve();
    });
  }
  this.storeUpvote = function storeUpvote(name, unique)
  { return this.checkRoomExists(name, function(resolve)
    { room = rooms[name];
      room.upvotesd[unique] = true;
      delete room.downvotes[unique];
      resolve();
    });
  }
  this.resetVotes = function resetVotes(name)
  { return this.checkRoomExists(name, function(resolve)
    { rooms[name].upvotes = Object.create(null);
      rooms[name].downvotes = Object.create(null);
      resolve();
    });
  }
  this.getNumUpvotes = function getNumUpvotes(name)
  { return this.checkRoomExists(name, function(resolve)
    { resolve(Object.keys(rooms[name].upvotes).length);
    });
  }
  this.getNumDownvotes = function getNumDownvotes(name)
  { return this.checkRoomExists(name, function(resolve)
    { resolve(Object.keys(rooms[name].downvotes).length);
    });
  }

  // settings
  this.getSetting = function getSetting(name, setting)
  { return this.checkRoomExists(name, function(resolve)
    { resolve(rooms[name].settings[setting]);
    });
  }
  this.setSetting = function setSetting(name, setting, value)
  { return this.checkRoomExists(name, function(resolve)
    { rooms[name].settings[setting] = value;
      resolve();
    });
  }
}