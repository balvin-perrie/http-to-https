'use strict';

let hostname = '';
let href = '';
const rules = JSON.parse(localStorage.getItem('rules') || '[]');

document.getElementById('purge-all').textContent = `entire list (${document.cookie ? document.cookie.split(';').length : 0})`;
if (!document.cookie) {
  document.getElementById('purge-all').dataset.disabled = true;
}

chrome.storage.local.get({
  enabled: true
}, prefs => {
  document.getElementById('enabled').checked = prefs.enabled;

  chrome.tabs.executeScript({
    code: `Object.assign({}, location)`,
    runAt: 'document_start'
  }, arr => {
    if (chrome.runtime.lastError) {
      document.getElementById('hostname').closest('tr').dataset.disabled = true;
      document.getElementById('regexp').closest('tr').dataset.disabled = true;
      document.getElementById('purge').dataset.disabled = true;
    }
    else {
      hostname = arr[0].hostname;
      href = arr[0].href;
      document.getElementById('purge').textContent = hostname;
      if (document.cookie.indexOf(hostname) === -1) {
        document.getElementById('purge').dataset.disabled = true;
      }

      document.getElementById('hostname').checked = localStorage.getItem(hostname) === 'true';
      for (const rule of rules) {
        if ((new RegExp(rule)).test(href)) {
          document.getElementById('regexp').checked = true;
          document.getElementById('regexp').value = rule;
          document.getElementById('detected-regexp').textContent = rule;
          break;
        }
      }
    }
  });
});

var update = () => {
  localStorage.setItem('rules', JSON.stringify(rules));
  chrome.runtime.getBackgroundPage(bg => {
    bg.updateRules();
    location.reload();
  });
};

document.addEventListener('change', e => {
  const id = e.target.id;
  if (id === 'enabled') {
    chrome.storage.local.get({
      enabled: true
    }, prefs => chrome.storage.local.set({
      enabled: prefs.enabled === false
    }));
  }
  else if (id === 'hostname' && e.target.checked) {
    localStorage.setItem(hostname, true);
  }
  else if (id === 'hostname') {
    localStorage.removeItem(hostname);
  }
  else if (id === 'regexp' && e.target.checked) {
    chrome.tabs.executeScript({
      code: 'window.prompt("Enter a valid regular expression that matches the current top-level URL")'
    }, arr => {
      if (arr[0]) {
        try {
          new RegExp(arr[0]);
          rules.push(arr[0]);
          update();
        }
        catch (e) {
          alert(e.message);
        }
      }
      else {
        e.target.checked = false;
      }
    });
  }
  else if (id === 'regexp') {
    const index = rules.indexOf(e.target.value);
    if (index !== -1) {
      rules.splice(index, 1);
      update();
    }
  }
});
document.addEventListener('click', e => {
  const id = e.target.id;
  if (id === 'purge' && hostname && document.cookie.indexOf(hostname) !== -1) {
    document.cookie = hostname + '=; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/';
    location.reload();
  }
  else if (id === 'purge-all') {
    for (const cookie of document.cookie.split(';')) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + '=; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/';
    }
    location.reload();
  }
});
