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
var song;
var loopId;
function setUpConnection()
{ console.log('connecting to server');
  if (ws)
  { ws.close();
    //clearInterval(loopId);
  }
  chrome.storage.local.get('host', function(items)
  { ws = new WebSocket('ws://'+items.host);
    ws.onopen = function()
    { ws.send("TweetFighter");
    };
    ws.onmessage = function (message)
    { if (message.data == "up") thumbUp();
      if (message.data == "down") thumbDown();
    };
    // loopId = setInterval(function()
    // { if (song != getSong())
    //   { song = getSong();
    //     ws.send("reset");
    //     console.log("reset");
    //   }
    // }, 500);
  });
}

/* BUTTON COMMUNICATION */

//console.log('asdf');
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
 if (message == "button")
   setUpConnection();
});