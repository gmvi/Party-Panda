/*   IMPORTANT DOM ELEMENTS   */
var room_input;
var create_room;
var close_room;

/*   HANDLERS   */
// check room
function room_input_oninput(ev)
{ create_room.disabled = true;
  if (room_input.value == "") // if the user has cleared the room name
  { create_room.textContent = "create room";
    return;
  }
  // else send a check room request
  create_room.textContent = "checking...";
  port.postMessage({type:"check", name:room_input.value});
}

// create room
function create_room_onclick(ev)
{ send("create:"+room_input.value, function(result)
  { if (result === true)
    { handleRoomCreated();
    }
    else
    { alert("creation failed");
      handleRoomClosed();
    }
  });
}

// close room
function close_room_onclick(ev)
{ send("close:"), function(result)
  { if (!result) /* handle error? */;
    switchView('create');
  }
  close_room.textContent = "closing...";
}

/*   VIEWS   */
function showView(which)
{ var views = document.getElementsByClassName('view');
  for (var i in views)
  { if (views[i].id == which)
      views[i].style.display = 'inherit';
    else
      views[i].style.display = 'none';
  }
}
function switchView(which)
{ showView(which);
  switch (which)
  { case ('create'):
      break;
    case ('status'):
      break;
    default:
      console.log("which: "+ which);
    case ('error'):
      chrome.storage.local.set({'view': 'create'});
      break;
  }
}

/*   CONTROLERS.JS COMMUNICATION   */
var port;
query = { currentWindow: true, active: true };
chrome.tabs.query(query, function (tabs)
{ var tabid = tabs[0].id;
  port = chrome.tabs.connect(tabid);
  port.onMessage.addListener(content_onmessage);
});

function content_onmessage(message)
{ if (message.type == "check")
  { if (message.name == room.textContent)
    { if (message.exists === false)
      { create_room.textContent = "create room";
        create_room.disabled = false;
      }
      else
      { create_room.textContent = "unavailable";
      }
    } // else discard message
  }
  else if (message.type == "create")
  { if (message.status)
    { title.textContent = message.name;
      switchView('create');
    }
    else
    { console.log('error! create room failed');
      switchView('error');
    }
  }
  else if (message.type == "error")
  { console.log(message.data);
    switchView('error');
  }
}

/*   MAIN   */
document.addEventListener('DOMContentLoaded', function ()
{ chrome.storage.local.get(['view'], function(items)
  { switchView(items.view || 'create');
  });
  // get important DOM elements
  room_input = document.getElementById('room_input');
  create_room = document.getElementById('create_room');
  close_room = document.getElementById('close_room');
  // DOM element manipulations
  create_room.style.width = window.getComputedStyle(create_room).width;
  // event listeners
  room_input.addEventListener('input', room_input_oninput);
  create_room.addEventListener('click', create_room_onclick);
  close_room.addEventListener('click', close_room_onclick);
});