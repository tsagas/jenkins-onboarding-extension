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
      el.click();
      var set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      set.call(el, txt);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      setTimeout(function() {
        var radio = document.querySelector('input[name="expiration"][value="604800"]');
        if (radio) radio.click();

        setTimeout(function() {
          var btn = document.querySelector('button[type="submit"]') ||
            Array.from(document.querySelectorAll('button')).find(function(b) {
              return b.textContent.trim().match(/generate|encrypt|create/i);
            });
          if (btn) btn.click();

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
        }, 1000);
      }, 1000);
    }, 500);
  });
})();
