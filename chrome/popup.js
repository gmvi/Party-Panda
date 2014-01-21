function save_host(e)
{ chrome.storage.local.set({'host': e.target.value});
}
function link()
{ q = { currentWindow: true,
        active: true }
  chrome.tabs.query(q, function (tabs)
  { tab = tabs[0];
    console.log(tab);
    chrome.tabs.sendMessage(tab.id, "button");
    window.close();
  });
}
document.addEventListener('DOMContentLoaded', function ()
{ chrome.storage.local.get(['host'], function(items)
  { document.getElementById('host').value = items.host || "localhost:5002";
  });
  document.getElementById('host').addEventListener('change', save_host);
  document.getElementById('submit').addEventListener('click', link);
});