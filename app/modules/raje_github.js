const CLIENT_ID = '7964cf9a6911b9794567'
const CLIENT_SECRET = '9c141e019ea619d60400baab423447806812840e'

const BrowserWindow = require('electron').BrowserWindow
const apiRequests = require('superagent')
const github = require('octonode')
const nodegit = require('nodegit')
const promisify = require("promisify-node")
const fse = promisify(require("fs-extra"))

const RAJE_STORAGE = require('./raje_storage')

let client

module.exports = {

  /**
   * 
   */
  initClient: function () {

    if (typeof global.github_data.access_token != 'undefinied')
      client = github.client(global.github_data.access_token)

    return client
  },

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

    function handleCallback(e, url) {
      var raw_code = /code=([^&]*)/.exec(url) || null;
      var code = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
      var error = /\?error=(.+)$/.exec(url);

      if (!code) {
        e.preventDefault();
        require('electron').shell.openExternal(url);
      }

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

    authWindow.webContents.on('will-navigate', function (e, url) {
      handleCallback(e, url);
    });

    authWindow.webContents.on('did-get-redirect-request', function (e, oldUrl, newUrl) {
      handleCallback(e, newUrl);
    });

    // Reset the authWindow on close
    authWindow.on('close', function () {
      authWindow = null;
    }, false);
  },

  /**
   * 
   */
  getPublicUserInfo: function (callback) {

    if (!client)
      client = this.initClient()

    let ghme = client.me()

    ghme.info(function (err, data, headers) {
      if (err) return callback(err)

      return callback(null, data)
    });
  },

  /**
   * 
   */
  manageLogin: function (callback) {

    RAJE_STORAGE.getGithubData((err, data) => {
      if (err) throw err

      // If there is no github data stored
      if (Object.keys(data).length === 0 && data.constructor === Object) {

        // Get the access token
        this.getAccessToken((err, access_token) => {
          if (err) throw (err)

          // Save the access token
          global.github_data.access_token = access_token

          // Get public user info
          this.getPublicUserInfo((err, data) => {
            if (err) return callback(err)

            // Create the data object
            global.github_data = {
              access_token: global.github_data.access_token,
              avatar_url: data.avatar_url,
              login: data.login,
              name: data.name,
            }

            // Save the data on storage
            RAJE_STORAGE.pushGithubData(global.github_data, err => {
              if (err) return callback(err)

              // Notify the client
              return callback(null, global.GITHUB_LOGIN_SUCCESS)
            })
          })
        })
      }
    })
  },


  initRepo: function () {

    let repository

    nodegit.Repository.init(global.savePath, 0)
      .then((repo) => {
        repository = repo

      })
      .then(() => {
        return repository.refreshIndex()

      })
      .then((idx) => {
        index = idx

      })
      .then(() => {
        return index.addAll()

      })
      .then(() => {
        return index.write()

      })
      .then(() => {
        return index.writeTree()

      })
      .then((oid) => {
        let author = nodegit.Signature.create(global.github_data.name, global.github_data.login, Date.now(), 60)
        return repository.createCommit("HEAD", author, author, "message", oid, []);

      })
      // Add a new remote
      .then(() => {
        return nodegit.Remote.create(repository, "origin",
            `git@github.com:${global.github_data.login}/push-example.git`)

          .then(function (remoteResult) {
            remote = remoteResult;

            // Create the push object for this remote
            return remote.push(
              ["refs/heads/master:refs/heads/master"], {
                callbacks: {
                  credentials: function (url, userName) {
                    return nodegit.Cred.sshKeyFromAgent(userName);
                  }
                }
              }
            );
          });
      }).done(function () {
        console.log("Done!");
      });
  }
}