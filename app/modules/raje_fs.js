const fs = require('fs-extra')
const cheerio = require('cheerio')
const entities = require('entities')
const path = require('path')
const md5 = require('md5')
const dircompare = require('dir-compare')

const RAJE_CONST = require('./raje_const')
const RAJE_HIDDEN_FILE = '.raje'
const RAJE_CORE = 'js/raje-core/core.js'

const RAJE_FS = {

  /**
   * Execute the first save for the article
   * it will create the new folder or "replace" the existing one
   */
  saveAsArticle: (toDir, document) => {

    return new Promise((resolve, reject) => {

      // Remove the directory if it already exists
      if (fs.existsSync(toDir))
        fs.removeSync(toDir)

      // Create the directory
      fs.mkdirp(toDir)

        // Copy all assets
        .then(() => RAJE_FS._copyAssets(toDir)

          // Write the template
          .then(() => fs.writeFile(path.join(toDir, RAJE_CONST.files.template), document)

            // Return the success message
            .then(() => resolve(RAJE_CONST.strings.fs.save_success))
          ))
    })
  },

  /**
   * This method only updates the index.html file and copy/rewrite the images
   */
  saveArticle: function (toDir, document) {

    return new Promise((resolve, reject) =>

      // Write the template file
      fs.writeFile(path.join(toDir, RAJE_CONST.files.template), document)

      // Copy the assets
      .then(() => RAJE_FS._copyAssets(toDir)

        // Return the success message
        .then(() => resolve(RAJE_CONST.strings.fs.save_success))))
  },

  /**
   * 
   */
  _copyAssets: (toDir) => {

    return new Promise((resolve, reject) => {

      resolve(RAJE_CONST.dirs.assets.map(fromDir => {

        // Set the path for the directory asset
        let toDirAsset = path.join(toDir, path.parse(fromDir).name)

        // If the directory doesn't exists, copy the content from the source
        if (!fs.existsSync(toDirAsset))
          fs.copy(fromDir, toDirAsset).catch(error => console.log(error))

        else
          RAJE_FS._compareAssets(toDirAsset, fromDir)
          .then(diffSet => {
            diffSet.map(file => fs.copy(file.path1, file.path2))
          })
          .catch(error => console.log(error))
      }))
    })
  },

  /**
   * 
   */
  _compareAssets: (toDir, fromDir) => {

    // Set the constants
    const keyword = 'distinct'
    const options = {
      compareContent: true
    }

    return new Promise((resolve, reject) => {

      if (!fs.existsSync(toDir) || !fs.existsSync(fromDir))
        reject('Error')

      // Compare the two folder 
      dircompare.compare(toDir, fromDir, options)
        .then(result => {

          // Create the set of different files
          let diffSet = []

          // Populate the set 
          if (!result.same)
            for (let file of result.diffSet)
              if (file.state == 'distinct')
                diffSet.push(file)

          resolve(diffSet)
        })
    })
  },


  /**
   * Copy all temporary images
   */
  copyAssetImages: function (path, callback) {

    let destinationFolderImage = `${path}/img`

    if (fs.existsSync(global.IMAGE_TEMP)) {

      // If the destination folder image doesn't exists
      if (!fs.existsSync(destinationFolderImage))
        fs.mkdirpSync(destinationFolderImage)

      fs.readdir(global.IMAGE_TEMP, (err, images) => {
        if (err) return callback(err)

        images.forEach(function (image) {

          fs.createReadStream(`${global.IMAGE_TEMP}/${image}`).pipe(fs.createWriteStream(`${destinationFolderImage}/${image}`))
        })

        return callback(null)
      })
    }
    return callback(null)
  },

  /**
   * Write the hidden RAJE file, to 
   */
  writeRajeHiddenFile: function (path, callback) {

    // Check if the hidden .raje file exists
    this.checkRajeHiddenFile(path, (err) => {

      // If there is an error, the file doesn't exist
      if (err)

        // Write the hidden .raje file
        return fs.writeFile(`${path}/${RAJE_HIDDEN_FILE}`, '', (err, res) => {

          if (err) return callback(err)

          return callback(null)
        })

      return callback(null)
    })


  },

  /**
   * Search inside the folder if there is a .raje file
   */
  checkRajeHiddenFile: function (path, callback) {

    fs.readdir(path, (err, fileArray) => {
      if (err) return callback(err)

      // Control if inside the root folder there is the .raje file
      let hiddenFileFound = false
      fileArray.forEach(function (file) {
        if (file == RAJE_HIDDEN_FILE)
          hiddenFileFound = true
      })

      if (hiddenFileFound)
        return callback(null)

      else
        return callback('Error, this is not a hidden .raje file')
    })
  },

  /**
   * Save the image in the temporary folder OR in the assets folder
   */
  saveImageTemp: function (image, path, callback) {

    // The folder where images have to be stored
    let destinationPath = (global.articleSettings.isWrapper) ? global.IMAGE_TEMP : `${path}img`

    // If the directory doesn't exist, create it
    if (!fs.existsSync(destinationPath))
      fs.mkdirpSync(destinationPath)

    // Copy (read and write) the image into the temporary image folder
    fs.readFile(image, (err, data) => {
      if (err) return callback(err)

      // Get the image name
      let filename = image.split('/')[image.split('/').length - 1]
      let destinationFilename = `${destinationPath}/${filename}`

      fs.writeFile(destinationFilename, data, err => {
        if (err) return callback(err)

        return callback(null, `img/${filename}`)
      })
    })
  },

  /**
   * Remove the temporary folder
   */
  removeImageTempFolder: function () {
    if (fs.existsSync(global.IMAGE_TEMP))
      fs.removeSync(global.IMAGE_TEMP)
  },

  /**
   * 
   */
  addRajeCoreInArticle: function (path, callback) {

    path = path.replace('file://', '')

    fs.readFile(path, 'utf8', (err, data) => {
      if (err) return callback(err)

      const $ = cheerio.load(data, {
        normalizeWhitespace: true
      })

      $('script[src="js/jquery.min.js"]')
        .after(`<script src="js/raje-core/init_core.js" data-rash-original-content=""/>`)

      fs.writeFile(path, entities.decodeHTML($.html()))

      return callback(null)
    })
  },

  /**
   * 
   */
  removeRajeCoreInArticle: function (path, callback) {

    path = path.replace('file://', '')

    fs.readFile(path, 'utf8', (err, data) => {
      if (err) return callback(err)

      const $ = cheerio.load(data, {
        normalizeWhitespace: true
      })

      $('script[src="js/raje-core/init_core.js"]').remove()

      fs.writeFile(path, entities.decodeHTML($.html()))

      return callback(null)
    })
  },

  /**
   * 
   */
  checkIfExists: path =>
    new Promise((resolve, reject) => {
      fs.pathExists(path)
        .then(exists => resolve(exists))
    })
}

module.exports = RAJE_FS