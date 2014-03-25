var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

var fakeredis = require('fakeredis');
var client = fakeredis.createClient();

var DatabaseController = require('../DatabaseController.js');
var db = new DatabaseController(client);

describe('DatabaseController', function TestDatabase()
{ beforeEach(db.clearAll.bind());
  after(db.clearAll.bind());
  after(db.close.bind());

  describe('#roomExists()', function() {
    it('should return false when room does not exist', function room_does_not_exist() {
      return db.roomExists('asdf').should.eventually.equal(false);
    });
    it('should return true after room has been created', function room_exists() {
      return db.createRoom('asdf').then(function() {
        return db.roomExists('asdf').should.eventually.equal(true);
      });
    });
    it('should return false after room has been closed', function room_has_been_closed() {
      return db.createRoom('asdf').then(function() {
        return db.closeRoom('asdf');
      }).then(function() {
        return db.roomExists('asdf').should.eventually.equal(false);
      });
    });
  });

  describe('#createRoom()', function() {
    it('should run without error', function create_room() {
      return db.createRoom('asdf').should.be.fulfilled;
    });
    it('should throw an error when a room already exists', function create_room_exists() {
      return db.createRoom('asdf').then(function() {
        db.createRoom('asdf').should.be.rejectedWith(TypeError);
      });
    });
    it('should succeed after room has been closed', function create_closed_room() {
      return db.createRoom('asdf').then(function() {
        return db.closeRoom('asdf');
      }).then(function() {
        return db.createRoom('asdf').should.be.fulfilled;
      });
    });
  });

  // Database.closeRoom has been implicitly tested to properly close rooms
  describe('#closeRoom()', function() {
    it('should throw an error when the room does not exist', function close_room_does_not_exist() {
      return db.closeRoom('asdf').should.be.rejectedWith(TypeError);
    });
  });

  describe('#getNumUpvotes', function() {
    it('it should return zero before adding votes', function get_upvotes_zero() {
      return db.createRoom('asdf').then(function() {
        return db.getNumUpvotes('asdf').should.eventually.equal(0);
      });
    });
    it('should return one after adding an upvote', function get_upvotes_one() {
      return db.createRoom('asdf').then(function() {
        return db.storeVote('asdf', 'user', 'up');
      }).then(function() {
        return db.getNumUpvotes('asdf').should.eventually.equal(1);
      });
    });
    it('should return zero after clearing votes', function get_upvotes_cleared() {
      return db.createRoom('asdf').then(function() {
        return db.storeVote('asdf', 'user', 'up');
      }).then(function() {
        return db.resetVotes('asdf');
      }).then(function() {
        return db.getNumUpvotes('asdf').should.eventually.equal(0);
      });
    });
  });
  describe('#getNumDownvotes', function() {
    it('should return zero before adding votes', function get_downvotes_zero() {
      return db.createRoom('asdf').then(function() {
        return db.getNumDownvotes('asdf').should.eventually.equal(0);
      });
    });
    it('should return one after adding a downvote', function get_downvotes_one() {
      return db.createRoom('asdf').then(function() {
        return db.storeVote('asdf', 'user', 'down');
      }).then(function() {
        return db.getNumDownvotes('asdf').should.eventually.equal(1);
      });
    });
    it('should return zero after clearing votes', function get_downvotes_cleared() {
      return db.createRoom('asdf').then(function() {
        return db.storeVote('asdf', 'user', 'down');
      }).then(function() {
        return db.resetVotes('asdf');
      }).then(function() {
        return db.getNumDownvotes('asdf').should.eventually.equal(0);
      });
    });
  });
  describe('#getVote', function() {
    it('should return null before adding votes', function get_vote_null() {
      return db.createRoom('asdf').then(function() {
        return db.getVote('asdf', 'user').should.eventually.equal(null);
      });
    });
    it('should return up after adding an upvote', function get_vote_up() {
      return db.createRoom('asdf').then(function() {
        return db.storeVote('asdf', 'user', 'up');
      }).then(function() {
        return db.getVote('asdf', 'user').should.eventually.equal('up');
      });
    });
    it('should return down after adding a downvote', function get_vote_down() {
      return db.createRoom('asdf').then(function() {
        return db.storeVote('asdf', 'user', 'down');
      }).then(function() {
        return db.getVote('asdf', 'user').should.eventually.equal('down');
      });
    });
    it('#getVote should return null after clearing votes', function get_vote_cleared() {
      return db.createRoom('asdf').then(function() {
        return db.storeVote('asdf', 'user', 'down');
      }).then(function() {
        return db.resetVotes('asdf');
      }).then(function() {
        return db.getVote('asdf', 'user').should.eventually.equal(null);
      });
    });
  });
  describe('#setVote', function () {
    it('should return the current votes', function set_vote() {
      return db.createRoom('asdf').then(function() {
        return db.storeVote('asdf', 'user', 'down');
      }).then(function(votes) {
        votes.should.have.property('upvotes', 0);
        votes.should.have.property('downvotes', 1);
        return db.storeVote('asdf', 'user2', 'up');
      }).then(function(votes) {
        votes.should.have.property('upvotes', 1);
        votes.should.have.property('downvotes', 1);
        return db.storeVote('asdf', 'user3', 'down');
      }).then(function(votes) {
        votes.should.have.property('upvotes', 1);
        votes.should.have.property('downvotes', 2);
      });
    });
    it('should clear an old vote when a new one is set', function switch_vote() {
      return db.createRoom('asdf').then(function() {
        return db.storeVote('asdf', 'user', 'down');
      }).then(function(votes) {
        return db.storeVote('asdf', 'user', 'up');
      }).then(function(votes) {
        votes.should.have.property('upvotes', 1);
        votes.should.have.property('downvotes', 0);
      });
    });
    it('should be rejected when vote is invalid', function invalid_vote() {
      return db.createRoom('asdf').then(function() {
        return db.storeVote('asdf', 'user', 'invalid');
      }).should.be.rejected;
    });
  });
  describe('settings', function() {
    it('should start empty', function() {
      return db.createRoom('asdf').then(function() {
        return db.getSetting('asdf', 'thing').should.eventually.equal(null);
      });
    });
    it('should take a value and keep it', function() {
      return db.createRoom('asdf').then(function() {
        return db.setSetting('asdf', 'thing', 'value');
      }).then(function() {
        return db.getSetting('asdf', 'thing').should.eventually.equal('value');
      });
    });
    it('values should overwrite properly', function() {
      return db.createRoom('asdf').then(function() {
        return db.setSetting('asdf', 'thing', 'value');
      }).then(function() {
        return db.setSetting('asdf', 'thing', 'other value');
      }).then(function() {
        return db.getSetting('asdf', 'thing').should.eventually.equal('other value');
      });
    });
    //TODO: test getSettings
  });
});