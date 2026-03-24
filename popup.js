function updateUI(state) {
  var steps = document.querySelectorAll('.step');
  steps.forEach(function(el) {
    var s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s < state.step) el.classList.add('done');
    else if (s === state.step) el.classList.add('active');
  });

  var info = document.getElementById('info');
  if (state.fullName) {
    info.style.display = 'block';
    info.innerHTML = '<b>Name:</b> ' + state.fullName + '<br><b>Username:</b> ' + state.username + '<br><b>Email:</b> ' + state.email;
    if (state.slackId) info.innerHTML += '<br><b>Slack ID:</b> ' + state.slackId;
    if (state.jiraTicket) info.innerHTML += '<br><b>Ticket:</b> ' + state.jiraTicket;
  }

  var startBtn = document.getElementById('startBtn');
  var resetBtn = document.getElementById('resetBtn');

  if (state.step > 0) {
    startBtn.style.display = 'none';
    resetBtn.style.display = 'block';
  } else {
    startBtn.style.display = 'block';
    resetBtn.style.display = 'none';
  }
}

document.getElementById('startBtn').addEventListener('click', function() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'startOnboarding' }, function(response) {
      if (chrome.runtime.lastError) {
        alert('Please run this from a Jira ticket page.\n\nError: ' + chrome.runtime.lastError.message);
        return;
      }
      window.close();
    });
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
