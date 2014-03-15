var assert = require("assert");
var MemoryDatabase = require('../MemoryDatabase.js');

describe('MemoryDatabase', function()
{ 
  var db;
  beforeEach(function before()
  { db = new MemoryDatabase();
  });

  describe('#roomExists()', function()
  { it('should return false when room does not exist', function(done)
    { db.roomExists('asdf').then(function(exists)
      { assert.equal(false, exists);
      	done();
      });
    });
    it('should return true after room has been created', function(done)
    { db.createRoom('asdf')
        .then(function()
      { db.roomExists('asdf')
          .then(function(exists)
        { assert.equal(true, exists);
          done();
        });
      });
    });
    it('should return false after room has been closed', function(done)
    { db.createRoom('asdf')
        .then(function()
      { db.closeRoom('asdf');
      }).then(function()
      { db.roomExists('asdf').then(function(exists)
        { assert.equal(false, exists);
          done();
        });
      });
    });
  });

  // describe('#createRoom()', function()
  // { it('should run without error', function(done)
  //   { db.createRoom('asdf').then(done);
  //   }
  // });
  // describe('#roomExists()', function()
  // { it()});

  //   it('should return an error when a room already exists')
});