function updateUI(state) {
  var steps = document.querySelectorAll('.step');
  steps.forEach(function(el) {
    var s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done', 'clickable');
    if (s < state.step) el.classList.add('done');
    else if (s === state.step) el.classList.add('active');
    // Make steps clickable when onboarding is active
    if (state.step > 0) el.classList.add('clickable');
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

var stepActions = {
  1: 'step1_openJenkins',
  2: 'step2_openAssignRoles',
  3: 'step3_openPipeline',
  4: 'step4_openSlack',
  5: 'step4_openSlack',
  6: 'step6_openYopass',
  7: 'step6_openYopass',
  8: 'step8_resolveJira'
};

function jumpToStep(targetStep) {
  var action = stepActions[targetStep];
  if (!action) return;
  // Update the state step first, then trigger the action
  chrome.runtime.sendMessage({ action: 'setState', data: { step: targetStep } }, function() {
    chrome.runtime.sendMessage({ action: action });
    window.close();
  });
}

// Make each step clickable
document.querySelectorAll('.step').forEach(function(el) {
  el.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'getState' }, function(state) {
      if (state.step === 0) return; // Not started yet
      var targetStep = parseInt(el.dataset.step);
      jumpToStep(targetStep);
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
