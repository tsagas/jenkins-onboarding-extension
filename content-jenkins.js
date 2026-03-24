// Jenkins content script
(function() {
  chrome.runtime.sendMessage({ action: 'getState' }, function(state) {
    if (!state || !state.fullName) return;

    var url = location.href;

    // Step 2: Fill addUser form
    if (url.includes('securityRealm/addUser') && state.step === 2) {
      var i = setInterval(function() {
        var un = document.querySelector('input[name="username"]');
        if (!un) return;
        clearInterval(i);
        un.value = state.username;
        document.querySelector('input[name="fullname"]').value = state.fullName;
        document.querySelector('input[name="email"]').value = state.email;
        document.querySelector('input[name="password1"]').value = 'changethis';
        document.querySelector('input[name="password2"]').value = 'changethis';
        [un,
          document.querySelector('input[name="fullname"]'),
          document.querySelector('input[name="email"]'),
          document.querySelector('input[name="password1"]'),
          document.querySelector('input[name="password2"]')
        ].forEach(function(x) {
          x.dispatchEvent(new Event('input', { bubbles: true }));
        });
        alert('User creation form filled!\nSubmit the form, then click the extension to continue.');

        // Watch for form submission / page change
        var observer = new MutationObserver(function() {
          if (document.querySelector('.success') || !document.querySelector('input[name="username"]')) {
            observer.disconnect();
            chrome.runtime.sendMessage({ action: 'step2_openAssignRoles' });
          }
        });

        // Also listen for navigation
        window.addEventListener('beforeunload', function() {
          chrome.runtime.sendMessage({ action: 'step2_openAssignRoles' });
        });
      }, 500);
    }

    // Step 3: Fill assign-roles
    if (url.includes('role-strategy/assign-roles') && state.step === 3) {
      var i = setInterval(function() {
        var addBtn = Array.from(document.querySelectorAll('button,input[type="button"],a')).find(function(b) {
          return (b.textContent || b.value || '').toLowerCase().includes('add user');
        });
        if (!addBtn) return;
        clearInterval(i);
        addBtn.click();
        setTimeout(function() {
          var userInput = document.querySelector('input[name="user"]') || document.querySelector('input[type="text"]:not([readonly])');
          if (userInput) {
            userInput.value = state.username;
            userInput.dispatchEvent(new Event('input', { bubbles: true }));
            userInput.dispatchEvent(new Event('change', { bubbles: true }));
            userInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
          }
          setTimeout(function() {
            var devCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(function(c) {
              return c.name.includes('Developer') || (c.closest('tr') && c.closest('tr').textContent.includes('Developer'));
            });
            if (devCheckbox) devCheckbox.checked = true;
            alert('Role assignment filled!\nCheck Developer role and click Save.');
          }, 1000);
        }, 1000);
      }, 500);
    }

    // Step 3 continued: After save, page navigates away from assign-roles
    // The content script re-runs on the new page, detect we're on Jenkins but not on assign-roles anymore
    if (!url.includes('assign-roles') && !url.includes('securityRealm/addUser') && !url.includes('add-user-to-alert-targets') && state.step === 3) {
      chrome.runtime.sendMessage({ action: 'step3_openPipeline' });
      return;
    }

    // Step 4: Fill alert-targets pipeline
    if (url.includes('add-user-to-alert-targets') && state.step === 4) {
      var pipelineTabId = null;
      chrome.runtime.sendMessage({ action: 'getState' }, function() {
        // Store this tab's ID for later
        pipelineTabId = 'self';
      });

      var i = setInterval(function() {
        var t = document.querySelectorAll('input[type="text"]');
        if (t.length < 3) return;
        clearInterval(i);
        t[0].value = state.fullName;
        t[1].value = state.username;
        t[2].value = state.email;
        t.forEach(function(x) {
          x.dispatchEvent(new Event('input', { bubbles: true }));
        });

        alert('Pipeline form partially filled.\nClick OK to open Slack and find the member ID.\nThe Slack ID will be auto-filled when found.');
        chrome.runtime.sendMessage({ action: 'step4_openSlack' });

        // Poll for slack ID to be set in state
        var j = setInterval(function() {
          chrome.runtime.sendMessage({ action: 'getState' }, function(s) {
            if (s && s.slackId) {
              clearInterval(j);
              // Find SLACK_USERNAME field (4th text input)
              var inputs = document.querySelectorAll('input[type="text"]');
              if (inputs.length >= 4) {
                inputs[3].value = s.slackId;
                inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
              }
              alert('Slack ID ' + s.slackId + ' filled!\nRun the pipeline, then click the extension to continue to Yopass.');
            }
          });
        }, 1000);
      }, 500);
    }
  });

  // Listen for messages to proceed to yopass
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === 'proceedToYopass') {
      chrome.runtime.sendMessage({ action: 'step6_openYopass' });
      sendResponse({ ok: true });
    }
  });
})();
