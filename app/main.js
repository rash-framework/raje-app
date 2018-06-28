/**
 * 
 * Main process of Electron.js 
 */

const electron = require('electron')
const app = electron.app
const RAJE_CONST = require('./modules/raje_const')

global.ROOT = __dirname

global.hasChanged
global.isNew
global.savePath

// This variable is used to know if the editor have to save
// images inside the tmp folder or in the RASH package
global.isWrapper

global.SPLASH = RAJE_CONST.files.splash
global.GITHUB_LOGIN_SUCCESS = RAJE_CONST.strings.github.login_success
global.GITHUB_LOGOUT_SUCCESS = RAJE_CONST.strings.github.logout_success
global.SAVE_SUCCESS = RAJE_CONST.strings.fs.save_success

global.articleSettings = {}
global.github_data = {}
global.screenSize

const {
  BrowserWindow,
  ipcMain,
  dialog,
  Menu
} = electron

const url = require('url')
const path = require('path')

const PACKAGE = require('./package.json')

const RAJE_FS = require('./modules/raje_fs.js')
const RAJE_MENU = require('./modules/raje_menu.js')
const RAJE_STORAGE = require('./modules/raje_storage.js')
const RAJE_GITHUB = require('./modules/raje_github.js')

const EDITOR_WINDOW = 'editor'
const SPLASH_WINDOW = 'splash'

let splashWindow
let editorWindow

const windows = {

  /**
   * Init the windowmanager and open the splash window
   */
  openSplash: () => {

    // DEBUG mode
    // RAJE_STORAGE.clearAll()

    // Get the url to the splash window
    let splashWindowUrl = url.format({
      pathname: path.join(__dirname, SPLASH),
      protocol: 'file:',
      slashes: true
    })

    splashWindow = new BrowserWindow({
      height: 500,
      width: 800,
      resizable: false,
      frame: false,
      movable: true
    })

    splashWindow.loadURL(splashWindowUrl)

    // Set the menu 
    Menu.setApplicationMenu(Menu.buildFromTemplate(RAJE_MENU.getSplashMenu()))

    splashWindow.show()
  },

  /**
   * Close the splash window
   */
  closeSplash: () => {

    splashWindow.close()
  },

  /**
   * Open the editable template  
   */
  openEditor: (localRootPath) => {

    windows.newArticle()

    //global.articleSettings.hasChanged = false

    /**
     * If localRootPath exists, the user is trying to one an existing article
     */
    /*
    if (localRootPath)
      windows.alreadyExistingArticle(localRootPath)
    else
      windows.newArticle()
      */
  },

  /**
   * 
   */
  newArticle: () => {

    // Remember that the document isn't saved yet
    global.articleSettings.isNew = true
    global.articleSettings.isWrapper = true

    let editorWindowUrl = url.format({
      pathname: path.join(__dirname, RAJE_CONST.files.template),
      protocol: 'file:',
      slashes: true
    })

    // Add the init_rajemce script
    RAJE_FS.addRajeCoreInArticle(editorWindowUrl)
      .then(() => windows.showEditor(editorWindowUrl))
  },

  /**
   * 
   */
  alreadyExistingArticle: function (localRootPath) {

    let splittedRootPath = localRootPath.split('/')

    let getFileName = function () {
      return splittedRootPath[splittedRootPath.length - 1]
    }

    let getDirectoryPath = function () {
      splittedRootPath.pop()
      return `${splittedRootPath.join('/')}/`
    }

    let getDirectoryName = function () {
      return splittedRootPath[splittedRootPath.length - 1]
    }

    // Store some important elements about the document
    global.TEMPLATE = getFileName()
    global.articleSettings.isNew = false
    global.articleSettings.isWrapper = false
    global.articleSettings.savePath = getDirectoryPath()
    global.articleSettings.folderName = getDirectoryName()

    // TODO check if the document has validated RASH content

    // Get the URL to open the editor
    editorWindowUrl = url.format({
      pathname: localRootPath,
      protocol: 'file:',
      slashes: true
    })

    RAJE_FS.checkIfExists(global.articleSettings.savePath)
      .then(exists => {
        if (exists) {
          RAJE_STORAGE.pushRecentArticleEntry(RAJE_STORAGE.createRecentArticleEntry(global.articleSettings.savePath, global.articleSettings.folderName))

          // Add the init_rajemce script
          RAJE_FS.addRajeCoreInArticle(editorWindowUrl)
            .then(() => windows.showEditor(editorWindowUrl))
        }
      })

    /*
    // Check if the folder exists
    RAJE_FS.checkIfExists(global.articleSettings.savePath, exists => {
      if (exists)
        // Copy the entire asset set inside the existing directory
        RAJE_FS.copyAssets(global.articleSettings.savePath, err => {
          if (err) throw err

          // Add the already created article here
          RAJE_STORAGE.pushRecentArticleEntry(RAJE_STORAGE.createRecentArticleEntry(global.articleSettings.savePath, global.articleSettings.folderName))

          // Add the init_rajemce script
          RAJE_FS.addRajeCoreInArticle(editorWindowUrl, err => {
            this.showEditor(editorWindowUrl)
          })
        })

      else
        windows.openSplash()
      */
  },

  /**
   * 
   */
  showEditor: function (editorWindowUrl) {

    editorWindow = new BrowserWindow({
      width: global.screenSize.width,
      height: global.screenSize.height,
      resizable: true
    })

    editorWindow.loadURL(editorWindowUrl)
    editorWindow.show()

    // Open the new window with the size given by the splash window
    //windowManager.open(EDITOR_WINDOW, 'RAJE', editorWindowUrl, null, )

    // Retrieve and save Github data
    global.getUserStoredData((err, data) => {
      if (err) throw err

      global.github_data = data

      // Update the app menu
      windows.updateEditorMenu(RAJE_MENU.getEditorMenu())
    })


    /**
     * Catch the close event
     */
    editorWindow.on('close', event => {

      // If the document is in hasChanged mode (need to be saved)
      if (global.articleSettings.hasChanged) {

        // Cancel the close event
        event.preventDefault()

        // Show the dialog box "the document need to be saved"
        dialog.showMessageBox({
          type: 'warning',
          buttons: ['Save changes [NOT IMPLEMENTED YET]', 'Discard changes', 'Continue editing'],
          title: 'Unsaved changes',
          message: 'The article has been changed, do you want to save the changes?',
          cancelId: 2
        }, (response) => {
          switch (response) {

            // The user wants to save the document
            case 0:
              // TODO save the document
              global.articleSettings.hasChanged = false
              editorWindow.close()
              break

              // The user doesn't want to save the document
            case 1:
              global.articleSettings.hasChanged = false
              editorWindow.close()
              break
          }
        })
      }
    })

    /**
     * When the editor is closed, remove rajemce from the article if is still there
     */
    editorWindow.on('closed', event => {

      windows.openSplash()

      RAJE_FS.removeRajeCoreInArticle(editorWindowUrl, err => {
        if (err) throw err
      })
    })
  },

  /**
   * Return true to let know that the client has Electron behind
   */
  hasBackend: function () {
    return true
  },

  /**
   * 
   */
  updateEditorMenu: function (menu) {
    // Set the menu 
    Menu.setApplicationMenu(Menu.buildFromTemplate(menu))
  }
}

/**
 * ##########################################################################
 * ################################### APP EVENTS ###########################
 * ##########################################################################
 */

/**
 * Event called when the app is ready
 */
app.on('ready', windows.openSplash)

/**
 * This event is called on OSX when the user click on icon in the dock
 */
app.on('activate', (event, hasVisibleWindows) => {

  // If there aren't any open windows
  if (!hasVisibleWindows)
    windows.openSplash()
})

/**
 * On OS X it is common for applications and their menu bar
 * to stay active until the user quits explicitly with Cmd + Q
 */
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * Remove temporary img folder
 */
app.on('quit', RAJE_FS.removeImageTempFolder)

/**
 * ##########################################################################
 * ################################### PROCEDURE CALL #######################
 * ##########################################################################
 */

/**
 * This method is used to call the function that 
 * opens the editor with the template
 * 
 * Called by the splash window
 */
ipcMain.on('createArticle', (event, arg) => {
  global.newArticle()
})


/**
 * 
 */
ipcMain.on('openArticle', (event, arg) => {
  global.openArticle()
})

/**
 * This method is used to let know to the client that
 * the HTML file it's opened by Electron (not by a browser)
 * 
 * If nothing is returned, tinymce isn't initialised
 * 
 * Called from the renderer process
 */
ipcMain.on('hasBackendSync', (event, arg) => {
  event.returnValue = windows.hasBackend()
})

/**
 * This method is used to save the current document 
 * calling the save dialog (in order to select where the document has to be saved)
 * 
 * Then The article is saved by the raje_fs module
 * 
 * After the save process, the url is updated loading the saved file url
 * 
 * Called from the renderer process
 */
ipcMain.on('saveAsArticle', (event, arg) => {
  // Show save dialog here
  let savePath = dialog.showSaveDialog({
    title: 'Save as',
    defaultPath: arg.title,
    properties: [
      'openDirectory'
    ]
  })

  try {

    if (typeof savePath == 'undefined')
      throw new Error()

    global.articleSettings.savePath = `${savePath}/`

    RAJE_FS.saveAsArticle(global.articleSettings.savePath, arg.document)
      .then(message => {
        global.articleSettings.isNew = false
        global.articleSettings.folderName = global.articleSettings.savePath.split('/')[global.articleSettings.savePath.split('/').length - 2]

        windows.updateEditorMenu(RAJE_MENU.getEditorMenu())

        // Save recent article entry
        RAJE_STORAGE.pushRecentArticleEntry(RAJE_STORAGE.createRecentArticleEntry(global.articleSettings.savePath, global.articleSettings.folderName))

        // Notify the client 
        global.sendNotification({
          text: message,
          type: 'success'
        })

        global.articleSettings.hasChanged = false
        return global.updateClientContent()
      })
      .catch(error => global.sendNotification({
        text: error.message,
        type: RAJE_CONST.strings.fs.error_type
      }))

    /*
    RAJE_FS.saveAsArticle(global.articleSettings.savePath, arg.document), (err, message) => {

      // Manage permission error
      if (err)
        return global.sendNotification({
          text: err.message,
          type: 'error'
        })

      // Store important variables to check the save state
      global.articleSettings.isNew = false
      global.articleSettings.folderName = global.articleSettings.savePath.split('/')[global.articleSettings.savePath.split('/').length - 2]

      windows.updateEditorMenu(RAJE_MENU.getEditorMenu())

      // Save recent article entry
      RAJE_STORAGE.pushRecentArticleEntry(RAJE_STORAGE.createRecentArticleEntry(global.articleSettings.savePath, global.articleSettings.folderName))

      // Notify the client 
      global.sendNotification({
        text: message,
        type: 'success'
      })

      global.articleSettings.hasChanged = false
      return global.updateClientContent()
    })*/
  }


  // If savePath doesn't exists
  catch (exception) {}
})

/**
 * 
 */
ipcMain.on('saveArticle', (event, arg) => {

  // If the document has been saved before
  if (!global.articleSettings.isNew && typeof global.articleSettings.savePath != "undefined") {
    RAJE_FS.saveArticle(global.articleSettings.savePath, arg.document)
      .then(message => {

        // Notify the client
        global.sendNotification({
          text: message,
          type: 'success',
          timeout: 2000
        })

        // Update client content
        global.articleSettings.hasChanged = false
        return global.updateClientContent()
      })
      .catch(error => console.log(error))
  }
})

/**
 * This method is used to select the image to import in the document
 * 
 * When the image is selected it's saved inside the image temporary folder 
 * (which is deleted when the app is closed)
 */
ipcMain.on('selectImageSync', (event, arg) => {

  // Show the open dialog with options
  let imagePath = dialog.showOpenDialog({
    filters: [{
      name: 'Images',
      extensions: ['jpg', 'png']
    }]
  })

  try {

    if (typeof imagePath == 'undefined')
      throw new Error()

    RAJE_FS.saveImageTemp(imagePath[0], global.articleSettings.savePath, (err, result) => {

      if (err) return event.returnValue = err

      return event.returnValue = result
    })

  } catch (exception) {
    return event.returnValue = null
  }
})

/**
 * 
 */
ipcMain.on('updateDocumentState', (event, arg) => {
  global.articleSettings.hasChanged = arg
})

/**
 * 
 */
ipcMain.on('getRecentArticles', (event, arg) => {
  RAJE_STORAGE.getRecentArticles((err, data) => {
    if (err) return err

    event.returnValue = data
  })
})

/**
 * 
 */
ipcMain.on('popRecentArticleEntry', (event, arg) => {
  RAJE_STORAGE.popRecentArticleEntry(arg.path)
})

/**
 * 
 */
ipcMain.on('openRecentArticleEntry', (event, arg) => {

  try {
    // Open the first element of what the dialog returns
    windows.openEditor(arg.path)
    windows.closeSplash()
  } catch (exception) {}
})

/**
 * 
 */
ipcMain.on('saveScreenSize', (event, arg) => {
  global.screenSize = arg
})

/**
 * 
 */
ipcMain.on('closeSplash', (event, arg) => {
  windows.closeSplash()
})

/**
 * 
 */
ipcMain.on('loginGithub', (event, arg) => {
  global.loginGithub()
})

/**
 * 
 */
ipcMain.on('getVersionSync', (event, arg) => {
  event.returnValue = PACKAGE.version
})

/**
 * ##########################################################################
 * ################################### GLOBAL METHOD ########################
 * ##########################################################################
 */

/**
 * Send a message to the renderer process
 * Start the save as process
 */
global.executeSaveAs = function () {
  editorWindow.webContents.send('executeSaveAs')
}

/**
 * Send a message to the renderer process
 * Start the save process
 */
global.executeSave = function () {

  // If the article hasn't been saved yet, call saveAs
  if (global.articleSettings.isNew)
    editorWindow.webContents.send('executeSaveAs')

  // Or call save
  else
    editorWindow.webContents.send('executeSave')
}

/**
 * 
 */
global.updateClientContent = function () {
  editorWindow.webContents.send('updateContent')
}

/**
 * 
 */
global.newArticle = function () {
  windows.openEditor(null)
  splashWindow.close()
}

/**
 * 
 */
global.openArticle = function () {
  // Select the article index
  let localRootPath = dialog.showOpenDialog({
    title: 'Open RASH article',
    properties: [
      'openFile'
    ],
    filters: [{
      name: 'HTML',
      extensions: ['html']
    }]
  })

  try {
    localRootPath = localRootPath[0]

    // Open the first element of what the dialog returns
    windows.openEditor(localRootPath)
    windows.closeSplash()
  } catch (exception) {}
}

/**
 * 
 */
global.sendNotification = function (message) {
  editorWindow.webContents.send('notify', message)
}

/**
 * 
 */
global.loginGithub = function () {

  RAJE_GITHUB.manageLogin((err, message) => {
    if (err) throw err

    global.sendNotification({
      text: message,
      type: 'success',
      timeout: 2000
    })

    windows.updateEditorMenu(RAJE_MENU.getEditorMenu())
  })
}

global.logoutGithub = function () {
  RAJE_STORAGE.deleteGithubData((err, message) => {
    if (err) throw err

    global.sendNotification({
      text: message,
      type: 'success',
      timeout: 2000
    })

    windows.updateEditorMenu(RAJE_MENU.getEditorMenu())
  })
}

/**
 * 
 * @param {*} callback 
 */
global.getUserStoredData = function (callback) {

  RAJE_STORAGE.getGithubData((err, data) => {
    if (err) throw (err)

    return callback(null, data)
  })
}

global.push = function () {
  RAJE_GITHUB.initRepo(global.articleSettings.savePath)
}