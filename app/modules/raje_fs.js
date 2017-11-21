const fs = require('fs-extra')
const cheerio = require('cheerio')

const RAJE_HIDDEN_FILE = '.raje'
const RAJE_CORE = 'js/raje-core/core.js'

module.exports = {

  /**
   * Execute the first save for the article
   * it will create the new folder or "replace" the existing one
   */
  saveAsArticle: function (path, document, callback) {

    // If the directory already exists, first remove it
    if (fs.existsSync(path))
      fs.removeSync(path)

    // In any case create the new directory
    fs.mkdir(path, (err, res) => {

      if (err) return callback(err)

      this.copyAssets(path, err => {
        if (err) return callback(err)

        // Create the template file
        fs.writeFile(`${path}/${global.TEMPLATE}`, document, (err, res) => {
          if (err) return callback(err)

          this.writeRajeHiddenFile(path, err => {
            if (err) return callback(err)

            return callback(null, global.SAVE_SUCCESS)
          })
        })
      })
    })
  },

  /**
   * This method only updates the index.html file and copy/rewrite the images
   */
  saveArticle: function (path, document, callback) {

    // Overwrite the index.html with the document
    fs.writeFile(`${path}${global.TEMPLATE}`, document, err => {
      if (err) return callback(err)

      // Copy/rewrite all images
      this.copyAssetImages(path, err => {
        if (err) return callback(err)

        // Write .raje file
        this.writeRajeHiddenFile(path, err => {
          if (err) return callback(err)

          return callback(null, global.SAVE_SUCCESS)
        })
      })
    })
  },

  /**
   * 
   */
  copyAssets: function (path, callback) {

    let length = global.ASSETS_DIRECTORIES.length - 1
    let ret = function () {

      length--

      if (length == 0)
        return callback(null)
    }

    // This copies the content of each directory in this array
    global.ASSETS_DIRECTORIES.forEach(function (directoryPath) {

      // Tries to copy the folder content only if the directory exists
      if (fs.existsSync(directoryPath)) {

        // Get the name of the directory
        let directoryPathName = path + directoryPath.split('/')[directoryPath.split('/').length - 1]

        // If the current directory exists, remove it
        if (fs.existsSync(directoryPathName))
          fs.removeSync(directoryPathName)

        // It tries to create the directory and copy its content
        fs.mkdir(directoryPathName, {
          overwrite: true
        }, err => {
          if (err) return callback(err)

          fs.copy(directoryPath, directoryPathName, err => {
            if (err) return callback(err)

            ret()
          })
        })
      }
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

      fs.writeFile(path, $.html())

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

      fs.writeFile(path, $.html())

      return callback(null)
    })
  },

  /**
   * 
   */
  checkIfExists: function (path, callback) {
    fs.exists(path, exists => {
      return callback(exists)
    })
  }
}