const CLIENT_ID = '7964cf9a6911b9794567'
const CLIENT_SECRET = '9c141e019ea619d60400baab423447806812840e'

const BrowserWindow = require('electron').BrowserWindow
const apiRequests = require('superagent')

module.exports = {

  /**
   * 
   */
  getAccessToken: function (callback) {

    // Your GitHub Applications Credentials
    var options = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scopes: ['user:user', 'public_repo'] // Scopes limit access for OAuth tokens.
    };

    // Build the OAuth consent page URL
    var authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      'node-integration': false
    });
    var githubUrl = 'https://github.com/login/oauth/authorize?';
    var authUrl = githubUrl + 'client_id=' + options.client_id + '&scope=' + options.scopes;
    authWindow.loadURL(authUrl);
    authWindow.show();

    function handleCallback(url) {
      var raw_code = /code=([^&]*)/.exec(url) || null;
      var code = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
      var error = /\?error=(.+)$/.exec(url);

      if (code || error) {
        // Close the browser if code found or error
        authWindow.destroy();
      }

      // If there is a code, proceed to get token from github
      if (code) {
        requestGithubToken(options, code);
      } else if (error) {
        callback(error)
      }
    }

    function requestGithubToken(options, code) {

      apiRequests
        .post('https://github.com/login/oauth/access_token', {
          client_id: options.client_id,
          client_secret: options.client_secret,
          code: code,
        })
        .end(function (err, response) {
          if (response && response.ok) {

            callback(null, response.body.access_token)
          } else {
            // Error - Show messages.
            callback(err);
          }
        });

    }

    // Handle the response from GitHub - See Update from 4/12/2015

    authWindow.webContents.on('will-navigate', function (event, url) {
      handleCallback(url);
    });

    authWindow.webContents.on('did-get-redirect-request', function (event, oldUrl, newUrl) {
      handleCallback(newUrl);
    });

    // Reset the authWindow on close
    authWindow.on('close', function () {
      authWindow = null;
    }, false);
  }
}