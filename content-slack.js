// Slack content script
(function() {
  function simClick(el) {
    var r = el.getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height / 2;
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(t) {
      el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }));
    });
  }

  function menuClick(el) {
    var r = el.getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height / 2;
    var opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
    el.dispatchEvent(new MouseEvent('mouseover', opts));
    el.dispatchEvent(new MouseEvent('mouseenter', opts));
    el.dispatchEvent(new MouseEvent('mousemove', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  function findCopyBtn() {
    var labels = Array.from(document.querySelectorAll('.c-menu_item__label'));
    var label = labels.find(function(l) { return l.textContent.trim() === 'Copy member ID'; });
    if (label) return label.closest('button') || label;
    return null;
  }

  chrome.runtime.sendMessage({ action: 'getState' }, function(state) {
    if (!state || !state.username) return;

    // Step 5: Search for user and copy member ID
    if (state.step === 5) {
      setTimeout(function() {
        var searchBtn = document.querySelector('[data-qa="top_nav_search"]');
        if (!searchBtn) return;
        simClick(searchBtn);

        var i = setInterval(function() {
          var el = document.activeElement;
          if (!el || el.getAttribute('aria-label') !== 'Query') return;
          clearInterval(i);

          el.innerHTML = '<p>' + state.username + '</p>';
          el.dispatchEvent(new Event('input', { bubbles: true }));

          setTimeout(function() {
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

            var j = setInterval(function() {
              var name = document.querySelector('[data-qa="member_name"]');
              if (!name) return;
              clearInterval(j);
              name.click();

              var k = setInterval(function() {
                var more = document.querySelector('[data-qa="member_profile_more_btn"]');
                if (!more) return;
                clearInterval(k);
                // Click neutral area outside message box to defocus, then open menu
                var neutral = document.querySelector('[data-qa="channel_sidebar"]') ||
                  document.querySelector('.p-workspace__sidebar') ||
                  document.querySelector('.p-top_nav');
                if (neutral) neutral.click();
                setTimeout(function() {
                  more.click();

                  var l = setInterval(function() {
                    var found = findCopyBtn();
                    if (!found) return;
                    clearInterval(l);
                    found.focus();
                    found.click();

                    // Watchdog: just poll clipboard, no retries
                    var w = setInterval(function() {
                      navigator.clipboard.readText().then(function(slackId) {
                        if (slackId && slackId.match(/^U[A-Z0-9]+$/)) {
                          clearInterval(w);
                          chrome.runtime.sendMessage({
                            action: 'step5_slackIdFound',
                            slackId: slackId
                          });
                        }
                      }).catch(function() {});
                    }, 500);
                  }, 1000);
                }, 500);
              }, 1000);
            }, 1000);
          }, 1000);
        }, 1000);
      }, 5000);
    }
  });

  // Listen for message to send in the DM
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === 'sendMessage') {
      // Close any open profile/search panels by pressing Escape
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));

      setTimeout(function() {
        var editors = document.querySelectorAll('.ql-editor');
        var msgEditor = Array.from(editors).find(function(el) {
          return el.getAttribute('aria-label') !== 'Query' && el.getAttribute('role') !== 'combobox';
        });

        if (!msgEditor) {
          var msgArea = document.querySelector('[data-qa="message_input"]') || document.querySelector('.p-message_input');
          if (msgArea) msgArea.click();

          setTimeout(function() {
            editors = document.querySelectorAll('.ql-editor');
            msgEditor = Array.from(editors).find(function(el) {
              return el.getAttribute('aria-label') !== 'Query' && el.getAttribute('role') !== 'combobox';
            });
            if (msgEditor) typeAndSend(msgEditor, msg.message);
          }, 1500);
        } else {
          typeAndSend(msgEditor, msg.message);
        }
      }, 1500);

      sendResponse({ ok: true });
      return true;
    }
  });

  function typeAndSend(editor, message) {
    editor.focus();
    // Convert newlines to <p> tags for Slack's editor
    var html = message.split('\n').map(function(line) { return '<p>' + line + '</p>'; }).join('');
    editor.innerHTML = html;
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    // Send the message by pressing Enter
    setTimeout(function() {
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

      setTimeout(function() {
        chrome.runtime.sendMessage({ action: 'step8_resolveJira' });
      }, 1500);
    }, 1500);
  }
})();
