var button = {};

button.mode = (enabled, tabId, append = '') => {
  let path = '';
  let title = 'HTTP to HTTPS';
  let badge = '';
  if (enabled === false && tabId === undefined) {
    path = 'disabled/';
    title += ' (globally disabled)';
  }
  else if (enabled === false) {
    badge = 'd';
    path = 'disabled/';
    title += append || ' (disabled on this page)';
  }
  else if (enabled && tabId) {
    path = 'converted/';
    title += append;
  }
  chrome.browserAction.setIcon({
    tabId,
    path: {
      '16': 'data/icons/' + path + '16.png',
      '19': 'data/icons/' + path + '19.png',
      '32': 'data/icons/' + path + '32.png',
      '38': 'data/icons/' + path + '38.png',
      '48': 'data/icons/' + path + '48.png'
    }
  });
  if (badge) {
    chrome.browserAction.setBadgeText({
      tabId,
      text: badge
    });
  }
  if (title) {
    chrome.browserAction.setTitle({
      tabId,
      title
    });
  }
};
{
  const startup = () => chrome.browserAction.setBadgeBackgroundColor({
    color: '#939393'
  });
  chrome.runtime.onStartup.addListener(startup);
  chrome.runtime.onInstalled.addListener(startup);
}
