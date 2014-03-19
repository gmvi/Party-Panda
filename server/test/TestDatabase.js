module.exports = function TestDatabase(db)
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

  describe('votes', function() {
    it('#getNumUpvotes should return zero before adding votes', function get_upvotes_zero() {
      return db.createRoom('asdf').then(function() {
        return db.getNumUpvotes('asdf').should.eventually.equal(0);
      });
    });
    it('#getNumDownvotes should return zero before adding votes', function get_downvotes_zero() {
      return db.createRoom('asdf').then(function() {
        return db.getNumDownvotes('asdf').should.eventually.equal(0);
      });
    });
    it('#getVote should return null before adding votes', function get_vote_null() {
      return db.createRoom('asdf').then(function() {
        return db.getVote('asdf', 'user').should.eventually.equal(null);
      });
    });
    it('#getNumUpvotes should return one after adding an upvote', function get_upvotes_one() {
      return db.createRoom('asdf').then(function() {
        return db.storeUpvote('asdf', 'user');
      }).then(function() {
        return db.getNumUpvotes('asdf').should.eventually.equal(1);
      });
    });
    it('#getNumDownvotes should return one after adding a downvote', function get_downvotes_one() {
      return db.createRoom('asdf').then(function() {
        return db.storeDownvote('asdf', 'user');
      }).then(function() {
        return db.getNumDownvotes('asdf').should.eventually.equal(1);
      });
    });
    it('#getVote should return up after adding an upvote', function get_vote_up() {
      return db.createRoom('asdf').then(function() {
        return db.storeUpvote('asdf', 'user');
      }).then(function() {
        return db.getVote('asdf', 'user').should.eventually.equal('up');
      });
    });
    it('#getVote should return down after adding a downvote', function get_vote_down() {
      return db.createRoom('asdf').then(function() {
        return db.storeDownvote('asdf', 'user');
      }).then(function() {
        return db.getVote('asdf', 'user').should.eventually.equal('down');
      });
    });
    it('#getNumUpvotes should return zero after clearing votes', function get_upvotes_cleared() {
      return db.createRoom('asdf').then(function() {
        return db.storeUpvote('asdf', 'user');
      }).then(function() {
        return db.resetVotes('asdf');
      }).then(function() {
        return db.getNumUpvotes('asdf').should.eventually.equal(0);
      });
    });
    it('#getNumDownvotes should return zero after clearing votes', function get_downvotes_cleared() {
      return db.createRoom('asdf').then(function() {
        return db.storeDownvote('asdf', 'user');
      }).then(function() {
        return db.resetVotes('asdf');
      }).then(function() {
        return db.getNumDownvotes('asdf').should.eventually.equal(0);
      });
    });
    it('#getVote should return null after clearing votes', function get_vote_cleared() {
      return db.createRoom('asdf').then(function() {
        return db.resetVotes('asdf');
      }).then(function() {
        return db.getVote('asdf', 'user').should.eventually.equal(null);
      });
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
  });
}