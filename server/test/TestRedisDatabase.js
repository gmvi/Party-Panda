var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

var TestDatabase = require('./TestDatabase.js');

var redis = require('redis');
var client = redis.createClient();

var RedisDatabase = require('../database/RedisDatabase.js');
var db = new RedisDatabase(client);

describe('RedisDatabase', TestDatabase.bind(null, db));