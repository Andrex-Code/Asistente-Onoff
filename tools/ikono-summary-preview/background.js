chrome.action.onClicked.addListener(async tab => {
  let url;
  try { url = new URL(tab.url); } catch { return; }
  if (!tab.id || url.protocol !== 'https:' || !['onoff.a.ikono.im','onoff.s.ikono.im'].includes(url.hostname)) return;
  try { await chrome.scripting.executeScript({target:{tabId:tab.id},files:['classification.js','probe.js','tc.js','auto.js']}); }
  catch { /* No alternate access or silent retry. */ }
});
