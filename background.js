// State management
let state = {
  fullName: '',
  username: '',
  email: '',
  slackId: '',
  jiraTicket: '',
  jiraTabId: null,
  step: 0
};

function resetState() {
  state = { fullName: '', username: '', email: '', slackId: '', jiraTicket: '', jiraTabId: null, step: 0 };
  chrome.storage.local.set({ onboardState: state });
}

function saveState() {
  chrome.storage.local.set({ onboardState: state });
}

function setName(name) {
  var p = name.trim().split(' ');
  state.fullName = name.trim();
  state.username = p[0][0].toLowerCase() + p[p.length - 1].toLowerCase();
  state.email = state.username + '@hfm.com';
  saveState();
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {

  if (msg.action === 'getState') {
    sendResponse(state);
    return;
  }

  if (msg.action === 'setState') {
    Object.assign(state, msg.data);
    saveState();
    sendResponse(state);
    return;
  }

  if (msg.action === 'reset') {
    resetState();
    sendResponse(state);
    return;
  }

  // Step 1: Start from Jira - mark In Progress, extract name, open Jenkins addUser
  if (msg.action === 'step1_start') {
    state.jiraTabId = sender.tab.id;
    state.jiraTicket = msg.ticket;
    setName(msg.fullName);
    state.step = 1;
    saveState();
    sendResponse(state);
    return;
  }

  if (msg.action === 'step1_openJenkins') {
    chrome.tabs.create({ url: 'https://jenkins.hfmarkets.com/manage/securityRealm/addUser' }, function(tab) {
      state.step = 2;
      saveState();
    });
    sendResponse(state);
    return;
  }

  // Step 2: After addUser form filled, open assign-roles
  if (msg.action === 'step2_openAssignRoles') {
    chrome.tabs.create({ url: 'https://jenkins.hfmarkets.com/manage/role-strategy/assign-roles' }, function(tab) {
      state.step = 3;
      saveState();
    });
    sendResponse(state);
    return;
  }

  // Step 3: After assign-roles saved, open alert-targets pipeline
  if (msg.action === 'step3_openPipeline') {
    chrome.tabs.create({ url: 'https://jenkins.hfmarkets.com/job/add-user-to-alert-targets/build?delay=0sec' }, function(tab) {
      state.step = 4;
      saveState();
    });
    sendResponse(state);
    return;
  }

  // Step 4: Open Slack
  if (msg.action === 'step4_openSlack') {
    chrome.tabs.create({ url: 'https://app.slack.com/client' }, function(tab) {
      state.step = 5;
      saveState();
    });
    sendResponse(state);
    return;
  }

  // Step 5: Slack ID found
  if (msg.action === 'step5_slackIdFound') {
    state.slackId = msg.slackId;
    state.step = 6;
    saveState();
    // Go back to pipeline tab and fill slack ID
    if (msg.pipelineTabId) {
      chrome.tabs.update(msg.pipelineTabId, { active: true });
    }
    sendResponse(state);
    return;
  }

  // Step 6: Open Yopass
  if (msg.action === 'step6_openYopass') {
    chrome.tabs.create({ url: 'https://yopass.hfmarkets.com' }, function(tab) {
      state.step = 7;
      saveState();
    });
    sendResponse(state);
    return;
  }

  // Step 7: Resolve Jira
  if (msg.action === 'step7_resolveJira') {
    if (state.jiraTabId) {
      chrome.tabs.update(state.jiraTabId, { active: true });
      setTimeout(function() {
        chrome.tabs.sendMessage(state.jiraTabId, { action: 'resolveTicket', ticket: state.jiraTicket });
      }, 500);
    }
    state.step = 8;
    saveState();
    sendResponse(state);
    return;
  }

  sendResponse({ error: 'unknown action' });
});

// Restore state on startup
chrome.storage.local.get('onboardState', function(data) {
  if (data.onboardState) state = data.onboardState;
});
