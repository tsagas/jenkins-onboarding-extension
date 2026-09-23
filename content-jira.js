// Jira content script
function findStatusButton() {
  return document.querySelector('button[data-testid="issue-field-status.ui.status-view.status-button.status-button"]') ||
    document.querySelector('button[aria-label$="- Change status"]');
}

// react-select ignores plain click() events — it selects on pointer/mouse down
function simClick(el) {
  var r = el.getBoundingClientRect();
  ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(t) {
    el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, view: window }));
  });
}

function findTransitionOption(labelRe) {
  var opts = document.querySelectorAll('div[role="option"]');
  for (var k = 0; k < opts.length; k++) {
    if (labelRe.test(opts[k].textContent.trim())) return opts[k];
  }
  return null;
}

function setResolutionDone(dlg) {
  var input = dlg.querySelector('input[id^="react-select"]');
  if (!input) return;
  var control = input.closest('[class*="select__control"], [class*="control"]');
  var value = control && control.querySelector('[class*="singleValue"], [class*="single-value"]');
  if (value && value.textContent.trim()) return;
  control.click();
  setTimeout(function() {
    var opt = Array.from(document.querySelectorAll('div[id*="-option-"]')).find(function(o) {
      return o.textContent.trim() === 'Done';
    });
    if (opt) simClick(opt);
  }, 400);
}

function postResolvedComment(key) {
  var text = 'Account has been created and the user has been notified through Slack.';
  var url = '/rest/api/2/issue/' + key + '/comment';
  var headers = { 'Content-Type': 'application/json', 'X-Atlassian-Token': 'no-check' };
  fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      body: {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: text }]
        }]
      }
    })
  }).then(function(r) {
    // Some Jira versions only accept a plain string comment body
    if (!r.ok) {
      return fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ body: text })
      });
    }
    return r;
  }).then(function(r) {
    if (r.ok) alert(key + ' resolved and comment added.');
    else alert('Resolved but comment failed: ' + r.status);
    chrome.runtime.sendMessage({ action: 'reset' });
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(function() {
    // Document lost focus (popup open or another tab active) — retry shortly
    setTimeout(function() {
      navigator.clipboard.writeText(text).catch(function() {});
    }, 1500);
  });
}

function collectInfo() {
  var t = document.body.innerText;
  // Extract full name - match "Name:" or "Full Name:" but not "Username:"
  var nameLines = t.split(/\r?\n/);
  var n = null;
  for (var i = 0; i < nameLines.length; i++) {
    var line = nameLines[i].trim();
    var nameMatch = line.match(/^(?:(?:Full\s*)?[Nn]ame|[Uu]ser):\s*(.+)/);
    if (nameMatch && !line.match(/^[Uu]sername/)) {
      n = nameMatch[1].trim();
      break;
    }
  }
  if (!n) {
    n = prompt('Enter full name (e.g., Daniil Yakush):');
    if (!n) return null;
  }
  // Try to extract username from ticket body (e.g. "Username: example_username")
  var usernameMatch = t.match(/[Uu]sername:\s*(\S+)/);
  var username = usernameMatch ? usernameMatch[1] : prompt('Enter username for ' + n + ':');
  if (!username) return null;
  var ticketMatch = location.pathname.match(/([A-Z]+-\d+)/);
  return { name: n, username: username, ticket: ticketMatch ? ticketMatch[1] : '' };
}

// The manifest and the popup both inject this script; without this guard each
// injection adds a duplicate listener and one start message opens N tabs.
if (!window.__onboardingJiraLoaded) {
  window.__onboardingJiraLoaded = true;

  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {

  if (msg.action === 'startOnboarding') {
    var info = collectInfo();
    if (!info) { sendResponse({ ok: false }); return true; }
    var n = info.name;
    var username = info.username;
    var ticket = info.ticket;

    chrome.runtime.sendMessage({ action: 'step1_start', fullName: n, username: username, ticket: ticket });

    // Copy name to clipboard for other forms
    copyToClipboard(n);

    var statusBtn = findStatusButton();
    if (statusBtn && statusBtn.textContent.trim().includes('In Progress')) {
      // Already in progress, skip transition
      chrome.runtime.sendMessage({ action: 'step1_openJenkins' });
    } else if (statusBtn) {
      statusBtn.click();
      setTimeout(function() {
        var start = findTransitionOption(/^start progress/i);
        if (!start) {
          document.body.click();
          chrome.runtime.sendMessage({ action: 'step1_openJenkins' });
          return;
        }
        simClick(start);
        // Field-less transitions apply immediately in the new UI; resolve-style
        // transitions open a dialog. Handle both, with a bounded wait.
        var tries = 0;
        var i = setInterval(function() {
          tries++;
          var dlg = document.querySelector('div[role="dialog"]');
          var submit = dlg && dlg.querySelector('button[type="submit"], #issue-workflow-transition-submit');
          if (submit) {
            clearInterval(i);
            submit.click();
            setTimeout(function() {
              chrome.runtime.sendMessage({ action: 'step1_openJenkins' });
            }, 3000);
          } else {
            var btn = findStatusButton();
            if ((btn && btn.textContent.trim().includes('In Progress')) || tries > 12) {
              clearInterval(i);
              chrome.runtime.sendMessage({ action: 'step1_openJenkins' });
            }
          }
        }, 1000);
      }, 1500);
    } else {
      chrome.runtime.sendMessage({ action: 'step1_openJenkins' });
    }
    sendResponse({ ok: true });
    return true;
  }

  // Popup step click before onboarding started: gather the user info only
  if (msg.action === 'collectUserInfo') {
    var ci = collectInfo();
    if (!ci) { sendResponse({ ok: false }); return true; }
    chrome.runtime.sendMessage({ action: 'step1_start', fullName: ci.name, username: ci.username, ticket: ci.ticket });
    copyToClipboard(ci.name);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'resolveTicket') {
    var tm = location.pathname.match(/([A-Z]+-\d+)/);
    var key = tm ? tm[1] : msg.ticket;

    var statusBtn = findStatusButton();
    if (!statusBtn) { alert('Status button not found'); return; }

    statusBtn.click();
    var r = setInterval(function() {
      var resolve = findTransitionOption(/^resolve \(no testing needed\)/i);
      if (!resolve) return;
      clearInterval(r);
      simClick(resolve);

      var tries = 0;
      var i = setInterval(function() {
        tries++;
        var dlg = document.querySelector('div[role="dialog"]');
        if (!dlg) {
          if (tries > 12) { clearInterval(i); alert('Resolve dialog did not appear'); }
          return;
        }
        clearInterval(i);
        setResolutionDone(dlg);
        setTimeout(function() {
          var submit = dlg.querySelector('button[type="submit"], #issue-workflow-transition-submit') ||
            Array.from(dlg.querySelectorAll('button')).find(function(b) {
              return /resolve|submit/i.test(b.textContent.trim());
            });
          if (submit) submit.click();
          setTimeout(function() { postResolvedComment(key); }, 3000);
        }, 1000);
      }, 500);
    }, 1500);
    sendResponse({ ok: true });
    return true;
  }
});
}