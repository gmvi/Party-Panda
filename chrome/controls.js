/* CONTROLS */
function thumbUp()
{ document.querySelector('#playbackControl .thumbUpButton').click();
}

function thumbDown()
{ document.querySelector('#playbackControl .thumbDownButton').click();
}

var nowplaying;

function getInfo()
{ nowplaying = nowplaying || document.querySelector('#playerBar .nowplaying');
  return { "song" : nowplaying.querySelector('.info .playerBarSong').innerText,
           "artist" : nowplaying.querySelector('.info .playerBarArtist').innerText,
           "album" : nowplaying.querySelector('.info .playerBarAlbum').innerText/*,
           "art" : nowplaying.querySelector('.cd_menu .playerBarArt')*/
         }
}

function getSong()
{ return document.querySelector('#playerBar .playerBarSong').innterText;
}

/* SERVER COMMUNICATION */

var ws;

var songChanged = function ()
{ var songElement = document.querySelector('.playerBarSong');
  var song = (songElement && songElement.text) || "";
  return function songChanged()
  { if (songElement.text != song)
    { song = songElement.text;
      return true;
    }
    else return false;
  }
}();
var loopId;
function websocket_onopen()
{ loopId = setInterval(function ()
  { if (songChanged())
    { console.log('track change');
      ws.send('change:{}');
    }
  }, 100);
};
function websocket_onclose()
{ clearInterval(loopId);
}
function parse(message)
{ var i = message.indexOf(':');
  if (i+1)
    message = [message.substring(0, i), message.substring(i+1)];
  else
    message = ["message", message];
  try
  { message[1] = JSON.parse(message[1]);
  }
  catch (err) {}
  return message;
}
function websocket_onmessage(message)
{ var parsed = parse(message.data);
  console.log(parsed);
  if (parsed[0] == "vote")
  { if (parsed[1] == "up") thumbUp();
    else if (parsed[1] == "down") thumbDown();
  }
}

function setUpConnection()
{ console.log('connecting to server');
  if (ws) ws.close();
  chrome.storage.local.get('host', function(items)
  { ws = new WebSocket('ws://'+items.host);
    ws.onopen = websocket_onopen;
    ws.onmessage = websocket_onmessage;
    ws.onclose = websocket_onclose;
  });
}

/* BUTTON COMMUNICATION */

//console.log('asdf');
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
 if (message == "button")
   setUpConnection();
});