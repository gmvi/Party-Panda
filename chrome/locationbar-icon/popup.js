/*   IMPORTANT DOM ELEMENTS   */
var roomNameInput;
var roomStateSwitch;

/*   CONTROLERS.JS COMMUNICATION   */
var port;
query = { currentWindow: true, active: true };
chrome.tabs.query(query, function (tabs)
{ var tabid = tabs[0].id;
  port = chrome.tabs.connect(tabid);
  port.onMessage.addListener(content_onmessage);
});

function content_onmessage(message)
{ switch (message.type) {
    case 'track_change':
      document.getElementById('settings').innerHTML = message.song;
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
    var name = e.target.value || "";
    chrome.storage.local.set({'room_name': name});
    roomNameInput.alt = name;
    // TODO: should be debounced to improve performance
    port.postMessage({type: 'room_name', name: name});
  });
  // // Need to protect against select attemtps turning into drag attempts.
  // // 
  // roomNameInput.addEventListener('focus', function(e) {
  //   setTimeout(function(){e.target.select();}, 0);
  // });
  roomNameInput.addEventListener('keypress', function(e) {
    if (e.keyCode == 13) {
      roomNameInput.blur();
    }
  });
  roomStateSwitch.addEventListener('click', function(e) {
    var is_open = e.target.checked;
    chrome.storage.local.set({'room_state': is_open});
    // TODO: should be debounced to improve performance
    port.postMessage({type: 'room_state', open: is_open});
  });
});