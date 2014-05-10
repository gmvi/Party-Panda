document.addEventListener('DOMContentLoaded', function on_content_load()
{ songInput = document.querySelector("input.playerBarSongInput");
  albumInput = document.querySelector("input.playerBarAlbumInput");
  artistInput = document.querySelector("input.playerBarArtistInput");
  songInfo = document.querySelector(".playerBarSong");
  albumInfo = document.querySelector(".playerBarAlbum");
  artistInfo = document.querySelector(".playerBarArtist");
  function update_on_enter(ev)
  { if (ev.keyCode == 13)
    { songInfo.innerText = songInput.value;
      albumInfo.innerText = albumInput.value;
      artistInfo.innerText = artistInput.value;
    }
  }
  elements = document.getElementsByClassName("enter-responsive");
  for (var i in elements)
  { elements[i].onkeypress = update_on_enter;
  }
  svi = document.getElementById("setViewInput");
  svi.onkeypress = function (ev)
  { if (ev.keyCode == 13)
    { chrome.storage.local.set({'view': svi.value});
    }
  }
});