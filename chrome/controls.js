var room;
var host = "localhost:5001";

/* CONTROLS */
function thumbUp() {
  document.querySelector('#playbackControl .thumbUpButton').click();
}

function thumbDown() {
  document.querySelector('#playbackControl .thumbDownButton').click();
}

var nowplaying;

function getInfo() {
  nowplaying = nowplaying || document.querySelector('#playerBar .nowplaying');
  return { "song" : nowplaying.querySelector('.info .playerBarSong').innerText,
           "artist" : nowplaying.querySelector('.info .playerBarArtist').innerText,
           "album" : nowplaying.querySelector('.info .playerBarAlbum').innerText/*,
           "art" : nowplaying.querySelector('.cd_menu .playerBarArt')*/
         }
}

/* SERVER COMMUNICATION */
var socket;
chrome.storage.local.get('host', function(items) {
  socket = io.connect(items.host + "/host");
  socket.on('down', thumbDown);
  socket.on('up', thumbUp);
});

var hasSongChanged = function () {
  var songElement = document.querySelector('.playerBarSong');
  var song = (songElement && songElement.text) || "";
  return function songChanged() {
    if (songElement.text != song) {
      song = songElement.text;
      return true;
    }
    else return false;
  }
}();

var loopId;
loopId = setInterval(function () {
  if (hasSongChanged()) {
    console.log('track change');
    if (room) {
      socket.emit('track', getInfo());
    }
  }
}, 100);

/* BUTTON COMMUNICATION */

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
 if (message == "button")
  socket.emit("new", "null");
  room = "null";
  socket.emit('track', getInfo());
});