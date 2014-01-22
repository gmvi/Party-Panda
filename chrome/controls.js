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
  var song = songElement.text;
  return(function ()
  { if (songElement.text == song)
      return false;
    else
      song = songElement.text;
      return true;
  });
}();
var loopId;
function setUpConnection ()
{ console.log('connecting to server');
  if (ws)
  { ws.close();
    clearInterval(loopId);
  }
  chrome.storage.local.get('host', function(items)
  { ws = new WebSocket('ws://'+items.host);
    ws.onopen = function ()
    { loopId = setInterval(function ()
      { if (songChanged())
        { console.log('track change');
          ws.send(JSON.stringify({type:"update"}));
        }
      }, 100);
    };
    ws.onmessage = function (message)
    { if (message.data == "up") thumbUp();
      if (message.data == "down") thumbDown();
    };
  });
}

/* BUTTON COMMUNICATION */

//console.log('asdf');
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
 if (message == "button")
   setUpConnection();
});