// Jira content script
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {

  if (msg.action === 'startOnboarding') {
    // Only handle on Jira-like pages or any page (for the prompt fallback)
    var t = document.body.innerText;
    var m = t.match(/(?:User|user|Name|name):\s*([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
    var n;
    if (!m) {
      n = prompt('Enter full name (e.g., Daniil Yakush):');
      if (!n) { sendResponse({ ok: false }); return true; }
    } else {
      n = m[1] + ' ' + m[2];
    }

    var ticketMatch = location.pathname.match(/([A-Z]+-\d+)/);
    var ticket = ticketMatch ? ticketMatch[1] : '';

    chrome.runtime.sendMessage({ action: 'step1_start', fullName: n, ticket: ticket });

    // Copy name to clipboard for other forms
    navigator.clipboard.writeText(n);

    var statusBtn = document.querySelector('#issue\\.fields\\.status-view\\.status-button');
    if (statusBtn && statusBtn.textContent.trim().includes('In Progress')) {
      // Already in progress, skip transition
      chrome.runtime.sendMessage({ action: 'step1_openJenkins' });
    } else if (statusBtn) {
      statusBtn.click();
      setTimeout(function() {
        var start = Array.from(document.querySelectorAll('span')).find(function(s) {
          return s.textContent.trim() === 'Start progress';
        });
        if (start) {
          start.closest('div[role="option"]').click();
          var i = setInterval(function() {
            var submit = document.querySelector('#issue-workflow-transition-submit');
            if (!submit) return;
            clearInterval(i);
            submit.click();
            setTimeout(function() {
              chrome.runtime.sendMessage({ action: 'step1_openJenkins' });
            }, 3000);
          }, 1000);
        } else {
          document.body.click();
          chrome.runtime.sendMessage({ action: 'step1_openJenkins' });
        }
      }, 1500);
    } else {
      chrome.runtime.sendMessage({ action: 'step1_openJenkins' });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'resolveTicket') {
    var ticketMatch = location.pathname.match(/([A-Z]+-\d+)/);
    var key = ticketMatch ? ticketMatch[1] : msg.ticket;

    var statusBtn = document.querySelector('#issue\\.fields\\.status-view\\.status-button');
    if (!statusBtn) { alert('Status button not found'); return; }

    statusBtn.click();
    setTimeout(function() {
      var resolve = Array.from(document.querySelectorAll('span')).find(function(s) {
        return s.textContent.trim() === 'Resolve (no testing needed)';
      });
      if (!resolve) { alert('Resolve option not found'); return; }
      resolve.closest('div').click();

      var i = setInterval(function() {
        var sel = document.querySelector('select#resolution');
        if (!sel) return;
        clearInterval(i);
        sel.value = '10000';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(function() {
          var submit = document.querySelector('#issue-workflow-transition-submit');
          if (submit) submit.click();
          setTimeout(function() {
            fetch('/rest/api/2/issue/' + key + '/comment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ body: 'Account has been created and the user has been notified through Slack.' })
            }).then(function(r) {
              if (r.ok) alert(key + ' resolved and comment added.');
              else alert('Resolved but comment failed: ' + r.status);
              chrome.runtime.sendMessage({ action: 'reset' });
            });
          }, 3000);
        }, 1000);
      }, 1000);
    }, 1500);
    sendResponse({ ok: true });
    return true;
  }
});
