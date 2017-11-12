/**
 * 
 * Main process of Electron.js 
 */

const electron = require('electron')
const app = electron.app

global.ROOT = __dirname
global.IMAGE_TEMP = `${global.ROOT}/img`

global.hasChanged
global.isNew
global.savePath

// This variable is used to know if the editor have to save
// images inside the tmp folder or in the RASH package
global.isWrapper

global.ASSETS_DIRECTORIES = [
  `${global.ROOT}/js`,
  `${global.ROOT}/css`,
  `${global.ROOT}/fonts`,
  IMAGE_TEMP
]

global.TEMPLATE = 'index.html'
global.SPLASH = 'splash.html'

global.screenSize

const {
  BrowserWindow,
  ipcMain,
  dialog,
  Menu
} = electron

const url = require('url')
const path = require('path')
const windowManager = require('electron-window-manager')

const RAJE_FS = require('./modules/raje_fs.js')
const RAJE_MENU = require('./modules/raje_menu.js')
const RAJE_STORAGE = require('./modules/raje_storage.js')
const RAJE_GITHUB = require('./modules/raje_github.js')

const EDITOR_WINDOW = 'editor'
const SPLASH_WINDOW = 'splash'

const windows = {

  /**
   * Init the windowmanager and open the splash window
   */
  openSplash: function () {

    // Init the window manager
    windowManager.init()

    // DEBUG mode
    // RAJE_STORAGE.clearAll()

    // Get the url to the splash window
    let splashWindowUrl = url.format({
      pathname: path.join(__dirname, SPLASH),
      protocol: 'file:',
      slashes: true
    })

    // Open the splash window
    windowManager.open(SPLASH_WINDOW, 'RAJE', splashWindowUrl, null, {
      height: 500,
      width: 800,
      resizable: false,
      frame: false,
      movable: true,
      //fullscreenable: false,
      icon: path.join(__dirname, 'build/icon.png')
    })

    // Set the menu 
    Menu.setApplicationMenu(Menu.buildFromTemplate(RAJE_MENU.getSplashMenu()))
  },

  /**
   * Close the splash window
   */
  closeSplash: function () {

    windowManager.close(SPLASH_WINDOW)
  },

  /**
   * Open the editable template  
   */
  openEditor: function (localRootPath) {

    global.hasChanged = false

    /**
     * If localRootPath exists, the user is trying to one an existing article
     */
    if (localRootPath)
      this.alreadyExistingArticle(localRootPath)
    else

      this.newArticle()
  },

  /**
   * 
   */
  newArticle: function () {

    // Remember that the document isn't saved yet
    global.isNew = true
    global.isWrapper = true

    let editorWindowUrl = url.format({
      pathname: path.join(__dirname, TEMPLATE),
      protocol: 'file:',
      slashes: true
    })

    // Add the init_rajemce script
    RAJE_FS.addRajeCoreInArticle(editorWindowUrl, err => {

      this.showEditor(editorWindowUrl)
    })
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

    // Store some important elements about the document
    global.isNew = false
    global.isWrapper = false
    global.TEMPLATE = getFileName()
    global.savePath = getDirectoryPath()

    // TODO check if the document has validated RASH content

    // Get the URL to open the editor
    editorWindowUrl = url.format({
      pathname: localRootPath,
      protocol: 'file:',
      slashes: true
    })

    /**
     * Copy the entire asset set inside the existing directory
     */
    RAJE_FS.copyAssets(global.savePath, err => {
      if (err) throw err

      // Add the already created article here
      RAJE_STORAGE.pushRecentArticleEntry(RAJE_STORAGE.createRecentArticleEntry(savePath, getFileName()))

      // Add the init_rajemce script
      RAJE_FS.addRajeCoreInArticle(editorWindowUrl, err => {
        this.showEditor(editorWindowUrl)
      })
    })
  },

  /**
   * 
   */
  showEditor: function (editorWindowUrl) {

    // Open the new window with the size given by the splash window
    windowManager.open(EDITOR_WINDOW, 'RAJE', editorWindowUrl, null, {
      width: global.screenSize.width,
      height: global.screenSize.height,
      resizable: true,
      icon: path.join(__dirname, 'build/icon.png')
    })

    // Update the app menu
    windows.updateEditorMenu(RAJE_MENU.getEditorMenu())

    /**
     * Catch the close event
     */
    windowManager.get(EDITOR_WINDOW).object.on('close', event => {

      // If the document is in hasChanged mode (need to be saved)
      if (global.hasChanged) {

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
              global.hasChanged = false
              windowManager.get(EDITOR_WINDOW).object.close()
              break

              // The user doesn't want to save the document
            case 1:
              global.hasChanged = false
              windowManager.get(EDITOR_WINDOW).object.close()
              break
          }
        })
      }
    })

    /**
     * When the editor is closed, remove rajemce from the article if is still there
     */
    windowManager.get(EDITOR_WINDOW).object.on('closed', event => {

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

    if (typeof savePath == 'undefinied')
      throw new Error()

    global.savePath = `${savePath}/`

    RAJE_FS.saveAsArticle(global.savePath, arg.document, (err, message) => {

      if (err) return

      // Store important variables to check the save state
      global.isNew = false

      windows.updateEditorMenu(RAJE_MENU.getEditorMenu(!global.isNew))

      // Save recent article entry
      RAJE_STORAGE.pushRecentArticleEntry(RAJE_STORAGE.createRecentArticleEntry(global.savePath, arg.title))

      // Notify the client 
      global.sendNotification({
        text: message,
        type: 'success',
        timeout: 2000
      })

      global.hasChanged = false
      return global.updateClientContent()
    })
  }

  // If savePath doesn't exists
  catch (exception) {}
})

/**
 * 
 */
ipcMain.on('saveArticle', (event, arg) => {

  // If the document has been saved before
  if (!global.isNew && typeof global.savePath != "undefined") {
    RAJE_FS.saveArticle(global.savePath, arg.document, (err, message) => {
      if (err) return

      // Notify the client
      global.sendNotification({
        text: message,
        type: 'success',
        timeout: 2000
      })

      // Update client content
      global.hasChanged = false
      return global.updateClientContent()
    })
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
    RAJE_FS.saveImageTemp(imagePath[0], (err, result) => {

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
  global.hasChanged = arg
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
 * ##########################################################################
 * ################################### GLOBAL METHOD ########################
 * ##########################################################################
 */

/**
 * Send a message to the renderer process
 * Start the save as process
 */
global.executeSaveAs = function () {
  windowManager.get(EDITOR_WINDOW).object.webContents.send('executeSaveAs')
}

/**
 * Send a message to the renderer process
 * Start the save process
 */
global.executeSave = function () {

  // If the article hasn't been saved yet, call saveAs
  if (global.isNew)
    windowManager.get(EDITOR_WINDOW).object.webContents.send('executeSaveAs')

  // Or call save
  else
    windowManager.get(EDITOR_WINDOW).object.webContents.send('executeSave')
}

/**
 * 
 */
global.updateClientContent = function () {
  windowManager.get(EDITOR_WINDOW).object.webContents.send('updateContent')
}

/**
 * 
 */
global.newArticle = function () {
  windowManager.closeCurrent()
  windows.openEditor(null)
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
  windowManager.get(EDITOR_WINDOW).object.webContents.send('notify', message)
}

/**
 * 
 */
global.loginGithub = function () {
  RAJE_GITHUB.getAccessToken((err, access_token) => {
    if (err) throw (err)

    RAJE_STORAGE.pushGithubData(access_token, err => {
      if (err) throw (err)

      console.log('The token is saved')
    })
  })
}