
document.addEventListener('DOMContentLoaded', function on_content_load()
{ submit = document.getElementById('submit');
  submit.removeEventListener('click', link);
  submit.addEventListener('click', setUpConnection);
  //thumbDownButton = document.getElementById('thumbDownButton');
  //thumbUpButton = document.getElementById('thumbUpButton');
  songInput = document.querySelector("input.playerBarSongInput");
  albumInput = document.querySelector("input.playerBarAlbumInput");
  artistInput = document.querySelector("input.playerBarArtistInput");
  songInfo = document.querySelector(".playerBarSong");
  albumInfo = document.querySelector(".playerBarAlbum");
  artistInfo = document.querySelector(".playerBarArtist");
  function update_on_enter(e)
  { if (e.keyCode == 13)
    { songInfo.innerText = songInput.value;
      albumInfo.innerText = albumInput.value;
      artistInfo.innerText = artistInput.value;
    }
  }
  elements = document.querySelectorAll(".enter-responsive")
  for (var i in elements)
  { elements[i].onkeypress = update_on_enter;
  }
});