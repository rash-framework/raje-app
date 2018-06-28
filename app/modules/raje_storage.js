const storage = require('electron-json-storage')
const util = require('util')
const datetime = require('node-datetime')
const path = require('path')

const RAJE_CONST = require('./raje_const')

global.RECENT_ARTICLE_STORAGE = "RECENT_ARTICLE_STORAGE"
global.GITHUB_DATA = 'GITHUB_DATA'

const storage_get = util.promisify(storage.get)

const RAJE_STORAGE = {

  /**
   * Create a JSON object with path title and date.
   * The path is the identifier
   */
  createRecentArticleEntry: (absolutePath, title) => {
    var dt = datetime.create()

    return {
      path: path.join(absolutePath,RAJE_CONST.files.template),
      title: title,
      date: `Created on ${dt.format('d/m/y')} at ${dt.format('H:M')}`
    }
  },

  /**
   * Add a new entry inside the storage
   */
  pushRecentArticleEntry: function (newArticle) {

    // Get all recent articles
    this.getRecentArticles((err, recentArticles) => {
      if (err) return callback(err)

      // Push the new article and check if is already created
      // In this case remove the new article
      recentArticles.push(newArticle)
      for (var i = 0; i <= recentArticles.length - 2; i++) {
        if (newArticle.path == recentArticles[i].path)
          recentArticles.splice(i, 1)
      }

      // Update the entire array
      this.updateRecentArticles(recentArticles)
    })
  },

  /**
   * Remove an entry
   */
  popRecentArticleEntry: function (path) {
    this.getRecentArticles((err, recentArticles) => {
      if (err) return callback(err)

      // Lookup for an article with the same path
      // If there is remove it
      for (var i = 0; i <= recentArticles.length - 1; i++) {
        if (path == recentArticles[i].path)
          recentArticles.splice(i, 1)
      }

      this.updateRecentArticles(recentArticles)
    })
  },

  /**
   * Update the recentArticles Array
   */
  updateRecentArticles: function (recentArticles) {
    storage.set(global.RECENT_ARTICLE_STORAGE, recentArticles, err => {
      if (err) throw callback(err)
    })
  },

  /**
   * Get all recent articles
   */
  getRecentArticles: function (callback) {

    storage.get(global.RECENT_ARTICLE_STORAGE, (err, recentArticles) => {
      if (err) return callback(err)

      // If the result isn't an array, instatiate it
      if (recentArticles.constructor !== Array)
        recentArticles = []

      return callback(null, recentArticles)
    })
  },

  /**
   * 
   */
  getRecentArticlesSync: function () {
    storage.get(global.RECENT_ARTICLE_STORAGE, (err, recentArticles) => {
      if (err) throw err

      // If the result isn't an array, instatiate it
      if (recentArticles.constructor !== Array)
        recentArticles = []

      return recentArticles
    })
  },

  /**
   * 
   */
  pushGithubData: function (data, callback) {
    storage.set(global.GITHUB_DATA, data, err => {
      if (err) throw callback(err)

      callback(null)
    })
  },

  /**
   * 
   */
  getGithubData: () =>
    new Promise((resolve, reject) =>
      storage_get(global.GITHUB_DATA)
      .then(data => resolve(data))
      .catch(error => reject(error))
    ),

  /**
   * 
   */
  deleteGithubData: function (callback) {
    storage.remove(global.GITHUB_DATA, err => {
      if (err) throw callback(err)

      global.github_data = {}

      callback(null, global.GITHUB_LOGOUT_SUCCESS)
    })
  },

  /**
   * DEBUG only - clear all elements in storage
   */
  clearAll: function () {
    storage.clear(err => {
      if (err) return console.log(err)
    })
  }
}

module.exports = RAJE_STORAGE