var socket = io.connect('/client');
var track;
var artist;
var album;

socket.on('connect', function() {
  socket.emit('join', this.roomName);
  socket.on('name', function(name) {
    //alert("name: " + name);
  });
  socket.on('track', function(trackInfo) {
    track.innerText = trackInfo.song;
    artist.innerText = trackInfo.artist;
    album.innerText = trackInfo.album;
  });
  socket.on('open', function() {
    //alert('open');
  });
  socket.on('close', function() {
    //alert('close!');
  });
  socket.on('error', function(error) {
    console.error(error);
  });
});

$(function()
{ var up = document.querySelector('#up');
  var down = document.querySelector('#down');
  track = document.getElementById('info-title');
  artist = document.getElementById('info-artist');
  album = document.getElementById('info-album');
  up.onclick = function()
  { socket.emit('control', 'up');
  }
  down.onclick = function()
  { socket.emit('control', 'down');
  }
});