const fs = require('fs-extra')
const cheerio = require('cheerio')
const entities = require('entities')
const path = require('path')
const dircompare = require('dir-compare')
const url = require('url')

const RAJE_CONST = require('./raje_const')

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
  saveArticle: (toDir, document) => {

    return new Promise(resolve =>

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
  _copyAssets: toDir => {

    return Promise.all(RAJE_CONST.dirs.assets.map(fromDir => {

        return new Promise((resolve, reject) => {

          // Set the path for the directory asset
          const toDirAsset = path.join(toDir, path.parse(fromDir).name)

          // If the directory doesn't exists, copy the content from the source
          if (!fs.pathExistsSync(toDirAsset)) {
            return resolve(fs.copy(fromDir, toDirAsset))
          }

          // If the directory exists 
          else {
            return resolve(RAJE_FS._compareAssets(toDirAsset, fromDir))
          }
        })
      }))

      // Manipulate the set of differente files
      .then(diffSet => {

        // Create a single set of files
        let set = []
        for (let diffDir of diffSet) {
          set.push(...diffDir)
        }

        return Promise.all(set.map(file => {

            return new Promise((resolve, reject) => {
              switch (file.state) {

                case 'distinct':
                  return resolve(fs.copySync(path.join(file.path1, file.name1), path.join(file.path2, file.name2)))

                case 'left':

                  // Look up for the right folder in the path
                  for (asset_rel of RAJE_CONST.dirs.assets_rel) {
                    if (file.path1.indexOf(asset_rel) > 0) {

                      // If the folder is there return the copy
                      const toFilePath = path.normalize(path.join(toDir, asset_rel, file.path1.split(asset_rel).slice(-1).pop(), file.name1))
                      return resolve(fs.copySync(path.join(file.path1, file.name1), toFilePath))
                    }
                  }

                  // If something is not ok
                  return resolve(false)
              }
            })
          }))

          // Return the files
          .then(result => result)
      })
      .catch(error =>
        error)
  },

  /**
   * 
   */
  _compareAssets: (toDir, fromDir) => {

    // Set the constants
    const keywords = ['distinct', 'left']
    const options = {
      compareContent: true,
      excludeFilter: RAJE_CONST.compareExcludeAssets.join(',')
    }

    return new Promise((resolve, reject) => {

      // If the starting directory exists
      if (!fs.existsSync(fromDir))
        fs.mkdirpSync(fromDir)

      // Compare all files 
      dircompare.compare(fromDir, toDir, options)
        .then(result => {

          // Create the set of different files
          let diffSet = []

          // Populate the set 
          if (!result.same)
            for (let file of result.diffSet)
              if (keywords.includes(file.state))
                diffSet.push(file)

          resolve(diffSet)
        })
        .catch(error =>
          reject(error))
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
   * Write the hidden RAJE file
   */
  writeRajeHiddenFile: dir => {

    // Create the content of the .raje file
    const content = JSON.stringify({
      body: ''
    })

    return new Promise((resolve, reject) =>
      RAJE_FS.checkRajeHiddenFile(path)
      .then(exists => {

        // Create the file if it doesn't exist
        if (!exists)
          fs.writeFile(path.join(dir, RAJE_CONST.files.raje_hidden), content)
      })
    )
  },

  /**
   * Search inside the folder if there is a .raje file
   */
  checkRajeHiddenFile: dir => {
    return new Promise(resolve =>
      fs.pathExists(path.join(dir, RAJE_CONST.files.raje_hidden)).then(exists => resolve(exists))
    )
  },

  /**
   * Save the image in the temporary folder OR in the assets folder
   */
  saveImageTemp: (image, absolutePath) =>

    new Promise((resolve, reject) => {

      // The folder where images have to be stored
      let destinationPath = (global.articleSettings.isWrapper) ? RAJE_CONST.dirs.assets.slice(-1)[0] : path.join(absolutePath, RAJE_CONST.dirs.image)

      // If the directory doesn't exist, create it
      if (!fs.existsSync(destinationPath))
        fs.mkdirpSync(destinationPath)

      fs.readFile(image)
        .then(data => {

          let filename = path.parse(image).base
          let destinationFilename = path.join(destinationPath, filename)

          fs.writeFile(destinationFilename, data)
            .then(() => resolve(path.join(RAJE_CONST.dirs.image, filename)))
            .catch(error => reject(error))
        })
        .catch(error => reject(error))
    }),

  /**
   * Remove the temporary folder
   */
  removeImageTempFolder: () => {
    if (fs.existsSync(RAJE_CONST.dirs.assets.slice(-1)[0]))
      fs.removeSync(RAJE_CONST.dirs.assets.slice(-1)[0])
  },

  /**
   * 
   */
  addRajeCoreInArticle: file => {
    return new Promise((resolve, reject) => {

      // Remove the host from the url
      file = RAJE_FS._removeProtocol(file)

      // Module cheerio options
      const cheerioOptions = {
        normalizeWhitespace: true
      }

      fs.readFile(file, 'utf8')
        .then(content => {

          // Add the script 
          const $ = cheerio.load(content, cheerioOptions)
          $('script[src="js/jquery.min.js"]').after(`<script src="js/raje-core/init_core.js" data-rash-original-content=""/>`)

          fs.writeFile(file, entities.decodeHTML($.html()))
            .then(() => resolve())
            .catch(error => reject(error))
        })
        .catch(error => reject(error))
    })
  },

  /**
   * 
   */
  removeRajeCoreInArticle: file => {
    return new Promise((resolve, reject) => {

      // Remove the host from the url
      file = RAJE_FS._removeProtocol(file)

      // Module cheerio options
      const cheerioOptions = {
        normalizeWhitespace: true
      }

      // Try to read the file
      fs.readFile(file, 'utf8')
        .then(content => {

          // Remove the script
          const $ = cheerio.load(content, cheerioOptions)
          $('script[src="js/raje-core/init_core.js"]').remove()

          // Write the new file
          fs.writeFile(file, entities.decodeHTML($.html()))
            .then(() => resolve())
            .catch(error => reject(error))
        })
        .catch(error => reject(error))
    })
  },

  /**
   * 
   */
  checkIfExists: path => {
    return new Promise((resolve, reject) => {
      fs.pathExists(path)
        .then(exists => resolve(exists))
    })
  },

  /**
   * 
   */
  _removeProtocol: file => file.replace(url.parse(file).protocol, '')
}

module.exports = RAJE_FS