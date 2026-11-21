const callback = 'https://fixture.chromiumapp.org/';
module.exports = {
  getRedirectURL: () => callback,
  async launchWebAuthFlow({url}) {
    const state = new URL(url).searchParams.get('state');
    return callback + '?' + new URLSearchParams({state, domain:'onoff.bitrix24.es', code:'test-code'});
  }
};
