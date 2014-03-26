module.exports = new function CodedayUserSystem()
{ this.name = "session";
  this.is_logged_in = function is_logged_in(req)
  { if (typeof(req) != "object" || typeof(req.session) != "object")
      throw new Error("req isn't a valid req object, or doesn't have a session");
    if (!req.session.token) req.session.token = req.sessionID;
    return true;
  }
  this.request_login = function request_login()
  {
  }
  this.accept_login = function accept_login(req)
  { return true;
  }
}();