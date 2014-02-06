function checkPandora(tabId, changeInfo, tab) {
  if (/^(https?:\/\/)?(www\.)?pandora.com(\/)?/.test(tab.url)) {
    chrome.pageAction.show(tabId);
  }
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkPandora);