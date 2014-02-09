module.exports = new function CodedayUserSystem()
{ this.name = "session";
  this.is_logged_in = function is_logged_in(session)
  { return true;
  }
  this.request_login = function request_login()
  {
  }
  this.accept_login = function accept_login(req)
  { return true;
  }
}();