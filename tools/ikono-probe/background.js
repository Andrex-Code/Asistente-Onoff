chrome.action.onClicked.addListener(async tab => {
  if (!tab.id || !tab.url?.startsWith('https://onoff.a.ikono.im/')) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['classification.js', 'probe.js', 'panel.js'] });
  } catch { /* Navigation or denied user activation: no retry or alternate access. */ }
});
