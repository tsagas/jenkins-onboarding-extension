chrome.storage.local.get('config', function(data) {
  if (!data.config) return;
  var c = data.config;
  if (c.jenkinsDomain) document.getElementById('jenkinsDomain').value = c.jenkinsDomain;
  if (c.yopassBase) document.getElementById('yopassDomain').value = c.yopassBase.replace(/^https?:\/\//, '');
  if (c.slackBase) document.getElementById('slackBase').value = c.slackBase;
  if (c.emailDomain) document.getElementById('emailDomain').value = c.emailDomain;
});

document.getElementById('saveBtn').addEventListener('click', function() {
  var jenkinsDomain = document.getElementById('jenkinsDomain').value.replace(/\/+$/, '').replace(/^https?:\/\//, '');
  var yopassDomain = document.getElementById('yopassDomain').value.replace(/\/+$/, '').replace(/^https?:\/\//, '');
  var slackBase = document.getElementById('slackBase').value.replace(/\/+$/, '') || 'https://app.slack.com';
  var emailDomain = document.getElementById('emailDomain').value.trim();

  var config = {
    jenkinsBase: 'https://' + jenkinsDomain,
    jenkinsDomain: jenkinsDomain,
    yopassBase: 'https://' + yopassDomain,
    slackBase: slackBase,
    emailDomain: emailDomain
  };

  chrome.storage.local.set({ config: config }, function() {
    var msg = document.getElementById('saved');
    msg.style.display = 'block';
    setTimeout(function() { msg.style.display = 'none'; }, 2000);
  });
});
