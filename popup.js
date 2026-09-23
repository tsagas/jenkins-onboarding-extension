function updateUI(state) {
  var steps = document.querySelectorAll('.step');
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var onTicket = tabs[0] && tabs[0].url && /([A-Z]+-\d+)/.test(tabs[0].url);
    steps.forEach(function(el) {
      var s = parseInt(el.dataset.step);
      el.classList.remove('active', 'done', 'clickable');
      if (s < state.step) el.classList.add('done');
      else if (s === state.step) el.classList.add('active');
      // Clickable during an active flow, or from a Jira ticket page before starting
      if (state.step > 0 || onTicket) el.classList.add('clickable');
    });
  });

  var info = document.getElementById('info');
  if (state.fullName) {
    info.style.display = 'block';
    info.innerHTML = '<b>Name:</b> ' + state.fullName + '<br><b>Username:</b> ' + state.username + '<br><b>Email:</b> ' + state.email;
    if (state.slackId) info.innerHTML += '<br><b>Slack ID:</b> ' + state.slackId;
    if (state.jiraTicket) info.innerHTML += '<br><b>Ticket:</b> ' + state.jiraTicket;
  }

  var startBtn = document.getElementById('startBtn');
  var continueBtn = document.getElementById('continueBtn');
  var resetBtn = document.getElementById('resetBtn');

  if (state.step > 0) {
    startBtn.style.display = 'none';
    continueBtn.style.display = 'block';
    resetBtn.style.display = 'block';
  } else {
    startBtn.style.display = 'block';
    continueBtn.style.display = 'none';
    resetBtn.style.display = 'none';
  }
}

// Each step maps to the action that opens/reopens that stage's page.
// The background actions set the state step themselves.
var stepActions = {
  1: 'gotoJira',
  2: 'step1_openJenkins',
  3: 'step2_openAssignRoles',
  4: 'step3_openPipeline',
  5: 'step4_openSlack',
  6: 'gotoPipeline',
  7: 'step6_openYopass',
  8: 'step8_resolveJira'
};

function jumpToStep(targetStep) {
  var action = stepActions[targetStep];
  if (!action) return;
  chrome.runtime.sendMessage({ action: action }, function() {
    window.close();
  });
}

// Make each step clickable
document.querySelectorAll('.step').forEach(function(el) {
  el.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'getState' }, function(state) {
      var targetStep = parseInt(el.dataset.step);
      if (state.step > 0) { jumpToStep(targetStep); return; }

      // Not started yet: allow jumping straight to a step from the ticket page
      chrome.storage.local.get('config', function(data) {
        var cfg = data.config || {};
        if (!cfg.jenkinsBase) {
          alert('Please configure the extension first.\nGo to chrome://extensions > Jenkins Onboarding > Details > Extension options');
          return;
        }
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          var tab = tabs[0];
          var url = tab && tab.url ? tab.url : '';
          var onTicket = /([A-Z]+-\d+)/.test(url) && (!cfg.jiraDomain || url.indexOf(cfg.jiraDomain) !== -1);
          if (!onTicket) {
            alert('Open the Jira ticket page first, then click a step to jump straight to it.');
            return;
          }
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-jira.js']
          }, function() {
            setTimeout(function() {
              chrome.tabs.sendMessage(tab.id, { action: 'collectUserInfo' }, function(response) {
                if (chrome.runtime.lastError || !response || !response.ok) {
                  alert('Could not read the ticket details.');
                  return;
                }
                jumpToStep(targetStep);
              });
            }, 200);
          });
        });
      });
    });
  });
});

document.getElementById('startBtn').addEventListener('click', function() {
  chrome.storage.local.get('config', function(data) {
    if (!data.config || !data.config.jenkinsBase) {
      alert('Please configure the extension first.\nGo to chrome://extensions > Jenkins Onboarding > Details > Extension options');
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var tabId = tabs[0].id;
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content-jira.js']
      }, function() {
        setTimeout(function() {
          chrome.tabs.sendMessage(tabId, { action: 'startOnboarding' }, function(response) {
            if (chrome.runtime.lastError) {
              alert('Error: ' + chrome.runtime.lastError.message);
              return;
            }
            window.close();
          });
        }, 200);
      });
    });
  });
});

document.getElementById('continueBtn').addEventListener('click', function() {
  chrome.runtime.sendMessage({ action: 'getState' }, function(state) {
    jumpToStep(state.step);
  });
});

document.getElementById('resetBtn').addEventListener('click', function() {
  chrome.runtime.sendMessage({ action: 'reset' }, function(state) {
    updateUI(state);
  });
});

chrome.runtime.sendMessage({ action: 'getState' }, function(state) {
  updateUI(state);
});
