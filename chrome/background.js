var exp = /^(https?:\/\/)?(www\.)?pandora\.com(\/|$)/;
var debug_exp = /^chrome-extension:\/\/aennkehanjdkblidjldjafaeongapdpo\/test\.html$/

function checkPandora(tabId, changeInfo, tab) {
  if (exp.test(tab.url) || debug_exp.test(tab.url)) {
    chrome.pageAction.show(tabId);
  }
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkPandora);