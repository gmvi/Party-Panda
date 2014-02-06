// requires jQeury
//(function(a){if(!a.jQuery){var d=document,b=d.createElement('script');b.src='//ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js';d.getElementsByTagName('head')[0].appendChild(b)}})(this);

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
  return(function ()
  { if (songElement.text == song)
      return false;
    else
      song = songElement.text;
      return true;
  });
}();
var loopId;
var websocket_onopen = function ()
{ loopId = setInterval(function ()
  { if (songChanged())
    { console.log('track change');
      ws.send("update:{}");
    }
  }, 100);
};
function parse(message)
{ var i = message.indexOf(':');
  if (i+1)
    return message.split(':');
  return ["message", message];
}
var websocket_onmessage = function (message)
{ var parsed = parse(message.data);
  if (parsed[0] == "rating")
  { if (parsed[1] == "up") thumbUp();
    if (parsed[1] == "down") thumbDown();
  }
}
function setUpConnection ()
{ console.log('connecting to server');
  if (ws)
  { ws.close();
    clearInterval(loopId);
  }
  chrome.storage.local.get('host', function(items)
  { ws = new WebSocket('ws://'+items.host);
    ws.onopen = websocket_onopen;
    ws.onmessage = websocket_onmessage;
  });
}

/* BUTTON COMMUNICATION */

//console.log('asdf');
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
 if (message == "button")
   setUpConnection();
});