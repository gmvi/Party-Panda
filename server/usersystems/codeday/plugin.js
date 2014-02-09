module.exports = new function CodedayUserSystem()
{ this.name = "codeday";
  var settings;
  try
  { settings = require("./settings.json");
  }
  catch (err)
  { console.log("[codeday plugin]: Please copy the defualt settings file to `settings.json`" +
                                  "and edit it");
    throw err;
  }
  this.is_logged_in = function is_logged_in(session)
  { return 'token' in session;
  }
  this.request_login = function request_login(req, res, send_to)
  { ret = encodeURIComponent(send_to);
    res.redirect('http://codeday.org/oauth?token='+settings.codeDayToken+'&return='+ret);
  }
  this.accept_login = function accept_login(req)
  { if (req.query.code)
    { req.session.token = req.query.code;
      req.session.save();
      return true;
    }
    else
      return false;
  }
}();