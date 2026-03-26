// Yopass content script
(function() {
  chrome.runtime.sendMessage({ action: 'getState' }, function(state) {
    if (!state || state.step !== 7 || !state.username) return;

    var jenkinsDomain = state.config ? state.config.jenkinsDomain : 'jenkins';
    var txt = 'user: ' + state.username + '\npass: changethis\n' + jenkinsDomain;

    var i = setInterval(function() {
      var el = document.querySelector('textarea[name="secret"]');
      if (!el) return;
      clearInterval(i);

      el.focus();
      el.select();
      document.execCommand('insertText', false, txt);

      setTimeout(function() {
        var radio = document.querySelector('input[name="expiration"][value="604800"]');
        if (radio) radio.click();

        // Wait for button to become enabled, then smash it
        var k = setInterval(function() {
          var btn = Array.from(document.querySelectorAll('button')).find(function(b) {
            return b.textContent.includes('Encrypt Message');
          });
          if (!btn || btn.disabled) return;
          clearInterval(k);

          var r = btn.getBoundingClientRect();
          var x = r.left + r.width / 2;
          var y = r.top + r.height / 2;
          var opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };

          btn.focus();
          btn.dispatchEvent(new MouseEvent('mouseover', opts));
          btn.dispatchEvent(new MouseEvent('mouseenter', opts));
          btn.dispatchEvent(new MouseEvent('mousemove', opts));
          btn.dispatchEvent(new PointerEvent('pointerdown', opts));
          btn.dispatchEvent(new MouseEvent('mousedown', opts));
          btn.dispatchEvent(new PointerEvent('pointerup', opts));
          btn.dispatchEvent(new MouseEvent('mouseup', opts));
          btn.dispatchEvent(new MouseEvent('click', opts));
          btn.click();

          var form = btn.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            try { form.requestSubmit(btn); } catch(e) {}
          }

          // Poll for the generated link
          var j = setInterval(function() {
            var link = document.querySelector('#root .truncate');
            if (!link) return;
            clearInterval(j);

            var msg = 'Hi, please find below your jenkins credentials.\nThe secret has expiry date, please open it in a timely manner.\n' + link.textContent;

            chrome.runtime.sendMessage({
              action: 'step7_sendSlackMessage',
              message: msg
            });
          }, 1000);
        }, 500);
      }, 1000);
    }, 500);
  });
})();
