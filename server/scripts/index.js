function parse(message)
{ i = message.indexOf(":");
  if (1 + i)
  { message = message.split(':');
    try
    { message[1] = JSON.parse(message[1]);
    }
    catch (SyntaxError) { }
    return message;
  }
  else
    return ["message", message];
}

var socket = new WebSocket("ws://"+location.host);

$(function()
{ up = document.querySelector('#up');
  upLabel = document.querySelector('label[for=up]');
  down = document.querySelector('#down');
  downLabel = document.querySelector('label[for=down]');
  socket.onmessage = function(message)
  { parsed = parse(message.data);
    if (message.type == "update")
    { up.checked = false;
      down.checked = false;
    }
    else if (message.type == "reset")
    { up.checked = false;
      down.checked = false;
    }
    else console.log(message);
  }
  up.onclick = function()
  { socket.send('vote:"up"');
  }
  down.onclick = function()
  { socket.send('vote:"down"');
  }
});