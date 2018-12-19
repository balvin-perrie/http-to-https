/* globals button */
'use strict';

var log = (...args) => false && console.log(...args);
var rules = [];
var updateRules = () => {
  rules = [];
  for (const rule of JSON.parse(localStorage.getItem('rules') || '[]')) {
    rules.push(new RegExp(rule));
  }
};
updateRules();

// change icon when page is loaded
var icons = {};
var onDOMContentLoaded = d => {
  if (d.frameId === 0 && icons[d.tabId]) {
    button.mode(...icons[d.tabId]);
    delete icons[d.tabId];
  }
};

// store timestamps
var cache = {};
chrome.tabs.onRemoved.addListener(tabId => {
  delete cache[tabId];
  delete icons[tabId];
});

var utils = {};
// true if redirection is not required
utils.policy = ({tabId, url, hostname}) => {
  if (url.startsWith('http://') !== true) {
    return true;
  }
  if (localStorage.getItem(hostname) === 'true') {
    icons[tabId] = [false, tabId, ' (hostname matching)'];
    return true;
  }
  for (const rule of rules) {
    if (rule.test(url)) {
      icons[tabId] = [false, tabId, ' (regexp matching)'];
      return true;
    }
  }
};
// HTTP to HTTPS converter
utils.convert = ({url}) => url.replace(/^http:\/\//, 'https://');
// only execute if function is not dead
utils.async = (d, success, failed = () => {}) => {
  if (cache[d.tabId] === d.timeStamp) {
    success(d);
  }
  else {
    failed();
  }
};
// fetch
utils.fetch = (url, hostname, callback) => {
  if (document.cookie.indexOf(hostname) !== -1) {
    log('fetched from cache', url);
    return callback({
      reason: document.cookie.split(hostname + '=')[1].split('; ')[0],
      responseURL: url
    });
  }

  const req = new XMLHttpRequest();
  req.open('GET', url);
  req.onreadystatechange = () => {
    if (req.readyState === req.HEADERS_RECEIVED) {
      let reason = 'true';
      if (req.status < 200 || req.status > 299) {
        reason = 'STATUS_CODE';
      }
      if (req.responseURL.startsWith('https://') === false) {
        reason = 'NOT_HTTPS_RESPONSE';
      }
      const resp = {
        responseURL: req.responseURL,
        reason
      };
      document.cookie = `${hostname}=${reason}; expires=` + (Date.now() + 10 * 24 * 60 * 60 * 1000);

      callback(resp);
      req.abort();
    }
  };
  req.onerror = () => callback(null, 'GET_ERROR');
  req.send();
};

// HTTP observer
var onBeforeNavigate = d => {
  if (d.frameId !== 0) {
    return;
  }
  const {hostname} = new URL(d.url);
  d.hostname = hostname;

  if (utils.policy(d)) {
    return;
  }
  cache[d.tabId] = d.timeStamp;
  const original = utils.convert(d);
  utils.fetch(original, d.hostname, (req, error) => {
    if (error) {
      icons[d.tabId] = [false, d.tabId, ` (cannot switched; ${error})`];
      return log('HTTPS not available', original, error);
    }
    utils.async(d, () => {
      if (req.reason === 'true') {
        log('switching from', original, 'to', req.responseURL);

        chrome.tabs.update(d.tabId, {
          url: req.responseURL || original
        }, () => icons[d.tabId] = [true, d.tabId, ' (cannot switched; switched to HTTPS)']);
      }
      else {
        icons[d.tabId] = [false, d.tabId, ` (${req.reason})`];
        log('HTTPS not available', original, req.reason);
      }
    }, () => log('tab is refreshed before HTTPS is resolved'));
  });
};

{
  const status = enabled => {
    chrome.webNavigation.onBeforeNavigate.removeListener(onBeforeNavigate);
    chrome.webNavigation.onDOMContentLoaded.removeListener(onDOMContentLoaded);
    if (enabled) {
      chrome.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate);
      chrome.webNavigation.onDOMContentLoaded.addListener(onDOMContentLoaded);
    }
    button.mode(enabled);
  };
  chrome.storage.onChanged.addListener(prefs => {
    if (prefs.enabled) {
      status(prefs.enabled.newValue);
    }
  });
  chrome.storage.local.get({
    enabled: true
  }, prefs => status(prefs.enabled));
}
