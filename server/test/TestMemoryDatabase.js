var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

var TestDatabase = require('./TestDatabase.js');

var MemoryDatabase = require('../database/MemoryDatabase.js');
var db = new MemoryDatabase();

describe('MemoryDatabase', TestDatabase.bind(null, db));