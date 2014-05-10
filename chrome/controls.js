var host = "localhost:5001";

/* CONTROLS */
function setThumbUp()
{ document.querySelector('#playbackControl .thumbUpButton').click();
}
function setThumbDown()
{ document.querySelector('#playbackControl .thumbDownButton').click();
}
function getArtist ()
{ var ArtistElement = document.querySelector("#playerBar .playerBarArtist");
  if (ArtistElement) return ArtistElement.innerText;
  else return null;
}
function getAlbum ()
{ var AlbumElement = document.querySelector("#playerBar .playerBarAlbum");
  if (AlbumElement) return AlbumElement.innerText;
  else return null;
}
function getSong ()
{ var songElement = document.querySelector("#playerBar .playerBarSong");
  if (songElement) return songElement.innerText;
  else return null;
}

// TODO ?: find a way to tie this into the apropriate updator methods of the
//         '.info > *' DOM elements so I don't need a setInterval in ws.onopen
var onSongChange = new function SongChangeEventEmitter()
{ var song;
  var callback;
  this.register = function register(cb)
  { if (!('call' in cb))
      throw new Exception("cb must be callable");
    callback = cb;
    var now = getSong();
    if (song != now)
    { song = now;
      return true;
    }
    else
      return false;
  }
}();

/* SERVER COMMUNICATION */

var ws;
function connect()
{ console.log('connecting to server');
  ws = new WebSocket("ws://"+host+"/");
  ws.onopen = websocket_onopen;
  ws.onmessage = websocket_onmessage;
  ws.onclose = websocket_onclose;
}
var loopId;
function websocket_onopen()
{ loopId = setInterval(function ()
  { if (songChanged())
    { console.log('track change');
      ws.send('change:{}');
    }
  }, 100);
}
function parse(message)
{ var i = message.indexOf(':');
  if (i+1) message = [message.substring(0, i), message.substring(i+1)];
  else message = ["message", message];
  try { message[1] = JSON.parse(message[1]); }
  catch (err) {}
  return message;
}
function websocket_onmessage(message)
{ console.log(message);
  var parsed = parse(message.data);
  console.log(parsed);
  if (parsed[0] == "vote")
  { if (parsed[1] == "up") thumbUp();
    else if (parsed[1] == "down") thumbDown();
  }
  else if (parsed[0] == "check")
  { if (parsed[1].name == currentCheckRoom)
    { port.postMessage({ type: "check",
                         name: parsed[1].name,
                         exists: parsed[1].exists });
    }
  }
  else if (parsed[0] == "create")
  { if (parsed[1].name == currentCreateRoom)
    { port.postMessage({ type: "create",
                         name: parsed[1].name,
                         status: parsed[1].status });
    }
  }
  else if (parsed[0] == "error")
  { port.postMessage({ type: "error",
                       data: parsed[1] });
  }
}
var waitInterval = 1;
function websocket_onclose()
{ clearInterval(loopId);
  console.log("lost connection to service, waiting "+waitInterval+" secs");
  setTimeout(connect, waitInterval * 1000);
  waitInterval++;
}

/* POPUP.JS COMMUNICATION */
var port;
chrome.runtime.onConnect.addListener(function(_port)
{ port = _port;
  port.onMessage.addListener(function (message)
  { if (message.type == "check")
      checkRoom(message.name);
    else if (message.type == "create")
      createRoom(message.name);
    else if (message.type == "close")
      closeRoom();
    else
      console.log("error! invalid message from popup: "+message);
  });
});

var currentCheckRoom;
function checkRoom(room_name)
{ console.log("check room");
  if (ws && ws.readyState == ws.OPEN)
  { currentCheckRoom = room_name;
    console.log("check room send");
    ws.send('check:"'+room_name+'"');
    // TODO: reserve room name on server side until new check:, create:room,
    //       or disconnect
  }
  else
  { port.postMessage({type:"error", data:"error connecting to service"});
  }
}

var currentRoom;
var currentCreateRoom;
function createRoom(room_name)
{ if (ws.readyState == WS.OPEN)
  { currentCreateRoom = room_name;
    ws.send('create:"'+room_name+'"');
  }
  else
  { port.postMessage({type:"error", data:"error connecting to service"});
  }
}

function closeRoom()
{ if (ws.readyState == WS.OPEN)
  { if (currentRoom)
    { ws.send("close:null");
    }
    else
    { console.log('error! close message from popup, but no room open');
    }
  }
  else
  { port.postMessage({type:"error", data:"error connecting to service"});
  }
}

document.addEventListener('DOMContentLoaded', function on_content_load()
{ connect();
});