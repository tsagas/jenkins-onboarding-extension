// Jenkins content script
(function() {
  chrome.runtime.sendMessage({ action: 'getState' }, function(state) {
    if (!state || !state.fullName) return;

    var url = location.href;

    // Step 2: Fill and submit addUser form
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

        // Auto-submit the form
        var submitBtn = document.querySelector('button[type="submit"],input[type="submit"]') ||
          Array.from(document.querySelectorAll('button')).find(function(b) {
            return b.textContent.trim().match(/create\s*user/i);
          });
        if (submitBtn) submitBtn.click();

        window.addEventListener('beforeunload', function() {
          chrome.runtime.sendMessage({ action: 'step2_openAssignRoles' });
        });
      }, 1000);
    }

    // Step 2 continued: after addUser submission, page may show success or redirect
    if (url.includes('securityRealm') && !url.includes('addUser') && state.step === 2) {
      chrome.runtime.sendMessage({ action: 'step2_openAssignRoles' });
      return;
    }

    // Step 3: Fill assign-roles, wait for user to Save
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
            alert('Role assignment filled!\nSelect the appropriate roles and click Save.');

            // Watch for Save button click to proceed
            var saveBtn = document.querySelector('button[name="Submit"]') ||
              Array.from(document.querySelectorAll('button,input[type="submit"]')).find(function(b) {
                return (b.textContent || b.value || '').match(/save/i);
              });
            if (saveBtn) {
              saveBtn.addEventListener('click', function() {
                setTimeout(function() {
                  chrome.runtime.sendMessage({ action: 'step3_openPipeline' });
                }, 1500);
              });
            }
          }, 1500);
        }, 1500);
      }, 500);
    }

    // Step 4: Fill alert-targets pipeline, then open Slack
    if (url.includes('add-user-to-alert-targets') && state.step === 4) {
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
        // Clear clipboard before opening Slack so watchdog has a clean baseline
        navigator.clipboard.writeText('').then(function() {
          chrome.runtime.sendMessage({ action: 'step4_openSlack' });
        });
      }, 500);
    }

    // Step 6: Back from Slack — fill Slack ID, re-copy name, build
    if (url.includes('add-user-to-alert-targets') && state.step === 6) {
      var inputs = document.querySelectorAll('input[type="text"]');
      if (inputs.length >= 4) {
        inputs[3].value = state.slackId;
        inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
      }
      navigator.clipboard.writeText(state.fullName);

      setTimeout(function() {
        var buildBtn = document.querySelector('button[name="Submit"]') ||
          Array.from(document.querySelectorAll('button,input[type="submit"]')).find(function(b) {
            return (b.textContent || b.value || '').match(/build|run|submit/i);
          });
        if (buildBtn) buildBtn.click();

        setTimeout(function() {
          chrome.runtime.sendMessage({ action: 'step6_openYopass' });
        }, 3000);
      }, 1000);
    }
  });
})();
