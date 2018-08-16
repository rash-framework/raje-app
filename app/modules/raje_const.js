const path = require('path')

let raje_const = {
  index_path: path.normalize(`${__dirname}/..`),
  windows: {
    editor: 'editor',
    splash: 'splash',
    settings: 'settings'
  },
  files: {
    template: 'index.html',
    splash: 'splash.html',
    settings: 'settings.html',
    raje_hidden: '.raje'
  },
  storage: {
    settings: 'settings_storage',
    recent_articles: 'recent_articl_storage',
    github_data: 'github_data_storage'
  },
  dirs: {
    image: 'img',
    assets: [
      path.join(path.normalize(`${__dirname}/..`), '/js'),
      path.join(path.normalize(`${__dirname}/..`), '/css'),
      path.join(path.normalize(`${__dirname}/..`), '/fonts'),
      path.join(path.normalize(`${__dirname}/..`), '/img')
    ]
  },
  strings: {
    github: {
      login_success: 'Yeah! you are successfully logged in with Github.',
      logout_success: 'All right! you are no longer loggeed in with Github.'
    },
    fs: {
      save_success: 'Hooray! all changes has been saved!',
      error_type: 'error'
    }
  }

}

module.exports = raje_const