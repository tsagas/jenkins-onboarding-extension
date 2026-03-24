// Slack content script
(function() {
  chrome.runtime.sendMessage({ action: 'getState' }, function(state) {
    if (!state || state.step !== 5 || !state.username) return;

    function simClick(el) {
      var r = el.getBoundingClientRect();
      var x = r.left + r.width / 2;
      var y = r.top + r.height / 2;
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(t) {
        el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }));
      });
    }

    // Wait for Slack to fully load
    setTimeout(function() {
      // Click search button
      var searchBtn = document.querySelector('[data-qa="top_nav_search"]');
      if (!searchBtn) return;
      simClick(searchBtn);

      // Wait for search input
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
              more.click();

              var l = setInterval(function() {
                var found = Array.from(document.querySelectorAll('button[role="menuitem"]')).find(function(b) {
                  return b.textContent.trim() === 'Copy member ID';
                });
                if (!found) return;
                clearInterval(l);
                simClick(found);

                setTimeout(function() {
                  // Read the copied member ID from clipboard
                  navigator.clipboard.readText().then(function(slackId) {
                    if (slackId && slackId.match(/^U[A-Z0-9]+$/)) {
                      chrome.runtime.sendMessage({
                        action: 'step5_slackIdFound',
                        slackId: slackId
                      });
                      alert('Member ID ' + slackId + ' found!\nSwitch back to the pipeline tab.');
                    }
                  });
                }, 500);
              }, 200);
            }, 200);
          }, 200);
        }, 300);
      }, 200);
    }, 3000); // Wait 3s for Slack to load
  });
})();
