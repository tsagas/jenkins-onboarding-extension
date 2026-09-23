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

    // Step 3: role-strategy page — switch to Assign Roles, add user, check Developer
    if (url.includes('/manage/role-strategy/') && state.step === 3 && !state.assignRolesDone) {
      var i = setInterval(function() {
        var tab = Array.from(document.querySelectorAll('a,button')).find(function(el) {
          return (el.textContent || '').trim() === 'Assign Roles';
        });
        if (tab) tab.click();
        var addBtn = document.querySelector('.role-strategy-add-button');
        if (!addBtn) return;
        clearInterval(i);
        addBtn.click();
        setTimeout(function() {
          var userInput = document.querySelector('.jenkins-dialog input[data-id="input"]') ||
            document.querySelector('input[name="user"]');
          if (userInput) {
            userInput.value = state.username;
            userInput.dispatchEvent(new Event('input', { bubbles: true }));
            userInput.dispatchEvent(new Event('change', { bubbles: true }));
            var okBtn = document.querySelector('.jenkins-dialog button[data-id="ok"]');
            setTimeout(function() {
              if (okBtn && !okBtn.disabled) okBtn.click();
              else userInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            }, 300);
          }
          setTimeout(function() {
            var checked = false;
            var row = Array.from(document.querySelectorAll('tr')).find(function(tr) {
              return tr.textContent.toLowerCase().includes(state.username);
            });
            if (row) {
              var table = row.closest('table');
              var headers = table ? Array.from(table.querySelectorAll('thead th')).map(function(th) { return th.textContent.trim(); }) : [];
              var cells = row.querySelectorAll('td');
              for (var c = 0; c < cells.length; c++) {
                var cb = cells[c].querySelector('input[type="checkbox"]');
                if (cb && ((cb.name && cb.name.includes('Developer')) || (headers[c] && headers[c].includes('Developer')))) {
                  cb.checked = true;
                  checked = true;
                  break;
                }
              }
            }
            chrome.runtime.sendMessage({ action: 'setState', data: { assignRolesDone: true } });
            alert(checked
              ? 'User added to list!\nSelect the appropriate roles and click Save.'
              : 'Could not auto-check Developer — assign the roles manually and click Save.');
          }, 2000);
        }, 800);
      }, 500);
    }

    // Step 3 continued: landed back on /manage/role-strategy/ after Save
    if (url.match(/\/manage\/role-strategy\/?$/) && state.step === 3 && state.assignRolesDone) {
      chrome.runtime.sendMessage({ action: 'step3_openPipeline' });
      return;
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
        setTimeout(function() {
          navigator.clipboard.writeText('').catch(function() {}).then(function() {
            chrome.runtime.sendMessage({ action: 'step4_openSlack' });
          });
        }, 2000);
      }, 500);
    }

    // Step 6: Back from Slack — fill Slack ID, re-copy name, wait for user to Build
    if (url.includes('add-user-to-alert-targets') && state.step === 6) {
      var inputs = document.querySelectorAll('input[type="text"]');
      if (inputs.length >= 4) {
        inputs[3].value = state.slackId;
        inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
      }
      navigator.clipboard.writeText(state.fullName).catch(function() {});
      alert('Slack ID filled. Verify all fields and click Build.');

      window.addEventListener('beforeunload', function() {
        chrome.runtime.sendMessage({ action: 'step6_openYopass' });
      });
    }
  });
})();
