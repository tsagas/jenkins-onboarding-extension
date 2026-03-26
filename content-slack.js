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

  function findMemberId() {
    // Search all elements for data attributes containing a Slack user ID
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      for (var j = 0; j < el.attributes.length; j++) {
        var val = el.attributes[j].value;
        if (val && val.match(/^U[A-Z0-9]{8,}$/)) return val;
      }
    }
    return null;
  }

  chrome.runtime.sendMessage({ action: 'getState' }, function(state) {
    if (!state || !state.username) return;

    // Step 5: Search for user and get member ID
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

              // Wait for profile panel, then scan DOM for member ID
              var k = setInterval(function() {
                var header = document.querySelector('.p-flexpane_header__primary');
                if (!header) return;

                var memberId = findMemberId();
                if (memberId) {
                  clearInterval(k);
                  chrome.runtime.sendMessage({
                    action: 'step5_slackIdFound',
                    slackId: memberId
                  });
                  return;
                }

                // Fallback: check clipboard in case user copies manually
                navigator.clipboard.readText().then(function(clip) {
                  if (clip && clip.match(/^U[A-Z0-9]+$/)) {
                    clearInterval(k);
                    chrome.runtime.sendMessage({
                      action: 'step5_slackIdFound',
                      slackId: clip
                    });
                  }
                }).catch(function() {});
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
    var html = message.split('\n').map(function(line) { return '<p>' + line + '</p>'; }).join('');
    editor.innerHTML = html;
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(function() {
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

      setTimeout(function() {
        chrome.runtime.sendMessage({ action: 'step8_resolveJira' });
      }, 1500);
    }, 1500);
  }
})();
