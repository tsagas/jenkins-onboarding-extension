// URL configuration — change these to match your environment
var CONFIG = {
  jenkinsBase: 'https://jenkins.hfmarkets.com',
  yopassBase: 'https://yopass.hfmarkets.com',
  slackBase: 'https://app.slack.com',
  emailDomain: 'hfm.com',
  jenkinsDomain: 'jenkins.hfm.com'
};

// State management
let state = {
  fullName: '',
  username: '',
  email: '',
  slackId: '',
  slackMessage: '',
  jiraTicket: '',
  jiraTabId: null,
  slackTabId: null,
  pipelineTabId: null,
  openedTabs: [],
  step: 0
};

function resetState() {
  state = { fullName: '', username: '', email: '', slackId: '', slackMessage: '', jiraTicket: '', jiraTabId: null, slackTabId: null, pipelineTabId: null, openedTabs: [], step: 0 };
  chrome.storage.local.set({ onboardState: state });
}

function saveState() {
  chrome.storage.local.set({ onboardState: state });
}

function setName(name) {
  var p = name.trim().split(' ');
  state.fullName = name.trim();
  state.username = p[0][0].toLowerCase() + p[p.length - 1].toLowerCase();
  state.email = state.username + '@' + CONFIG.emailDomain;
  saveState();
}

function trackTab(tab) {
  state.openedTabs.push(tab.id);
  saveState();
}

function closeAllOpenedTabs() {
  state.openedTabs.forEach(function(tabId) {
    try { chrome.tabs.remove(tabId); } catch(e) {}
  });
  state.openedTabs = [];
  saveState();
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {

  if (msg.action === 'getState') {
    sendResponse(Object.assign({}, state, { config: CONFIG }));
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

  // Step 1: Start from Jira
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
    chrome.tabs.create({ url: CONFIG.jenkinsBase + '/manage/securityRealm/addUser' }, function(tab) {
      trackTab(tab);
      state.step = 2;
      saveState();
    });
    sendResponse(state);
    return;
  }

  // Step 2: open assign-roles
  if (msg.action === 'step2_openAssignRoles') {
    chrome.tabs.create({ url: CONFIG.jenkinsBase + '/manage/role-strategy/assign-roles' }, function(tab) {
      trackTab(tab);
      state.step = 3;
      saveState();
    });
    sendResponse(state);
    return;
  }

  // Step 3: open alert-targets pipeline
  if (msg.action === 'step3_openPipeline') {
    chrome.tabs.create({ url: CONFIG.jenkinsBase + '/job/add-user-to-alert-targets/build?delay=0sec' }, function(tab) {
      trackTab(tab);
      state.pipelineTabId = tab.id;
      state.step = 4;
      saveState();
    });
    sendResponse(state);
    return;
  }

  // Step 4: Open Slack
  if (msg.action === 'step4_openSlack') {
    chrome.tabs.create({ url: CONFIG.slackBase + '/client' }, function(tab) {
      trackTab(tab);
      state.slackTabId = tab.id;
      state.step = 5;
      saveState();
    });
    sendResponse(state);
    return;
  }

  // Step 5: Slack ID found — switch back to pipeline tab and re-inject
  if (msg.action === 'step5_slackIdFound') {
    state.slackId = msg.slackId;
    state.step = 6;
    saveState();
    if (state.pipelineTabId) {
      chrome.tabs.update(state.pipelineTabId, { active: true }, function() {
        setTimeout(function() {
          chrome.scripting.executeScript({
            target: { tabId: state.pipelineTabId },
            files: ['content-jenkins.js']
          });
        }, 500);
      });
    }
    sendResponse(state);
    return;
  }

  // Step 6: Open Yopass
  if (msg.action === 'step6_openYopass') {
    chrome.tabs.create({ url: CONFIG.yopassBase }, function(tab) {
      trackTab(tab);
      state.step = 7;
      saveState();
    });
    sendResponse(state);
    return;
  }

  // Step 7: Yopass done, send Slack message
  if (msg.action === 'step7_sendSlackMessage') {
    state.slackMessage = msg.message;
    state.step = 8;
    saveState();
    // Switch to Slack tab and send message
    if (state.slackTabId) {
      chrome.tabs.update(state.slackTabId, { active: true }, function() {
        setTimeout(function() {
          chrome.tabs.sendMessage(state.slackTabId, {
            action: 'sendMessage',
            message: state.slackMessage
          });
        }, 1000);
      });
    }
    sendResponse(state);
    return;
  }

  // Step 8: Slack message sent, resolve Jira
  if (msg.action === 'step8_resolveJira') {
    state.step = 9;
    saveState();
    closeAllOpenedTabs();
    if (state.jiraTabId) {
      chrome.tabs.update(state.jiraTabId, { active: true });
      setTimeout(function() {
        chrome.scripting.executeScript({
          target: { tabId: state.jiraTabId },
          files: ['content-jira.js']
        }, function() {
          setTimeout(function() {
            chrome.tabs.sendMessage(state.jiraTabId, { action: 'resolveTicket', ticket: state.jiraTicket });
          }, 200);
        });
      }, 500);
    }
    sendResponse(state);
    return;
  }

  sendResponse({ error: 'unknown action' });
});

// Restore state on startup
chrome.storage.local.get('onboardState', function(data) {
  if (data.onboardState) state = data.onboardState;
});
