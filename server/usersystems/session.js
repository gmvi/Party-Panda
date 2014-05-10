module.exports = new function CodedayUserSystem()
{ this.name = "session";
  this.is_logged_in = function is_logged_in(req)
  { if (typeof(req) != "object" || !('sessionID' in req.sessionID))
      throw new Error("req isn't a valid req object, or doesn't have a sessionID");
    return true;
  }
  this.request_login = function request_login()
  {
  }
  this.accept_login = function accept_login(req)
  { return true;
  }
  this.unique = function unique(req)
  { return req.sessionID;
  }
}();