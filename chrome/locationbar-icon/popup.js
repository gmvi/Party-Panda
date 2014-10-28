/*   IMPORTANT DOM ELEMENTS   */
var roomNameInput;
var roomStateSwitch;

/*   HANDLERS   */
// user control events

//  port.postMessage({type:"check", name:room_input.value});


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
{ // get important DOM elements
  roomNameInput = document.getElementById('room-name');
  roomStateSwitch = document.getElementById('room-switch');
  chrome.storage.local.get(['room_state', 'room_name'], function(items)
  { roomNameInput.value = items.room_name;
    roomNameInput.alt = items.room_name;
    roomNameInput.checked = items.room_state;
    roomStateSwitch.checked = items.room_state;
    // give the event loop a chance to set the switch state before css transitions are turned on
    setTimeout(function() {
      roomStateSwitch.parentElement.classList.add("switch-slide");
    }, 50);
  });
  // event listeners
  roomNameInput.addEventListener('input', function(e) {
    var value = e.target.value || "";
    chrome.storage.local.set({'room_name': value});
    roomNameInput.alt = value;
    // call a debounced 'send room name' function
  });
  roomNameInput.addEventListener('focus', function(e) {
    setTimeout(function(){e.target.select();}, 0);
  });
  roomNameInput.addEventListener('keypress', function(e) {
    if (e.keyCode == 13) {
      roomNameInput.blur();
    }
  });
  roomStateSwitch.addEventListener('click', function(e) {
    chrome.storage.local.set({'room_state': e.target.checked});
    // call a less debounced 'send open status' function
  });
});