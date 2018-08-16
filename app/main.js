/**
 * 
 * Main process of Electron.js 
 */

const electron = require('electron')
const app = electron.app

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
const windowManager = require('electron-window-manager')

const PACKAGE = require('./package.json')

const RAJE_FS = require('./modules/raje_fs.js')
const RAJE_MENU = require('./modules/raje_menu.js')
const RAJE_STORAGE = require('./modules/raje_storage.js')
const RAJE_GITHUB = require('./modules/raje_github.js')
const RAJE_CONST = require('./modules/raje_const')

let splashWindow
let editorWindow


// DEBUG mode
// RAJE_STORAGE.clearAll()

windowManager.init()

//#region Splash and Editor manage

/**
 * 
 */
const openSplash = () => {

  // Get the url to the splash window
  splashWindowUrl = url.format({
    pathname: path.join(__dirname, RAJE_CONST.files.splash),
    protocol: 'file:',
    slashes: true
  })

  windowManager.open(RAJE_CONST.windows.splash, RAJE_CONST.windows.splash, splashWindowUrl, false, {
    height: 500,
    width: 800,
    resizable: false,
    frame: false,
    movable: true
  })

  // Set the menu 
  Menu.setApplicationMenu(Menu.buildFromTemplate(RAJE_MENU.getSplashMenu()))
}

/**
 * 
 */
const closeSplash = () => {

  windowManager.close(RAJE_CONST.windows.splash)
}

/**
 * 
 * @param {*} localRootPath 
 */
const openEditor = (localRootPath = null) => {

  global.articleSettings.hasChanged = false

  if (localRootPath)
    alreadyExistingArticle(localRootPath)
  else
    openNewArticle()
}

const openNewArticle = () => {

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
    .then(() => showEditor(editorWindowUrl))
}

const alreadyExistingArticle = localRootPath => {

  // Store some important elements about the document
  global.articleSettings.isNew = false
  global.articleSettings.isWrapper = false
  global.articleSettings.savePath = path.parse(localRootPath).dir
  global.articleSettings.folderName = path.parse(path.dirname(localRootPath)).name

  // TODO check if the document has validated RASH content

  // Get the URL to open the editor
  editorWindowUrl = path.normalize(url.format({
    pathname: localRootPath,
    protocol: 'file:',
    slashes: true
  }))

  RAJE_FS.checkIfExists(global.articleSettings.savePath)
    .then(exists => {
      if (exists) {
        RAJE_STORAGE.pushRecentArticleEntry(RAJE_STORAGE.createRecentArticleEntry(global.articleSettings.savePath, global.articleSettings.folderName))

        // Add the init_rajemce script
        RAJE_FS.addRajeCoreInArticle(editorWindowUrl)
          .then(() =>
            RAJE_FS._copyAssets(global.articleSettings.savePath)
            .then(assets => showEditor(editorWindowUrl))
          )
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
      openSplash()
    */
}

const showEditor = editorWindowUrl => {

  // Open the new window with the size given by the splash window
  windowManager.open(RAJE_CONST.windows.editor, RAJE_CONST.windows.editor, editorWindowUrl, null, {
    width: global.screenSize.width,
    height: global.screenSize.height,
    resizable: true
  })

  windowManager.get(RAJE_CONST.windows.editor).object.on('close', event => {

    // If the document is in hasChanged mode (need to be saved)
    if (global.articleSettings.hasChanged) {

      // Cancel the close event
      event.preventDefault()

      // Show the dialog box "the document need to be saved"
      dialog.showMessageBox({
        type: 'warning',
        buttons: ['Save changes', 'Discard changes', 'Continue editing'],
        title: 'Unsaved changes',
        message: 'The article has been changed, do you want to save the changes?',
        cancelId: 2
      }, (response) => {
        switch (response) {

          // The user wants to save the document
          case 0:
            // TODO save the document
            global.articleSettings.hasChanged = false
            windowManager.get(RAJE_CONST.windows.editor).close()
            break

            // The user doesn't want to save the document
          case 1:
            global.articleSettings.hasChanged = false
            windowManager.get(RAJE_CONST.windows.editor).close()
            break
        }
      })
    }
  })

  // Retrieve and save Github data
  global.getUserStoredData()
    .then(data => {
      global.github_data = data

      // Update the app menu
      updateEditorMenu(RAJE_MENU.getEditorMenu())
    })

  /**
   * When the editor is closed, remove rajemce from the article if is still there
   */
  windowManager.get(RAJE_CONST.windows.editor).object.on('closed', event => {

    openSplash()

    RAJE_FS.removeRajeCoreInArticle(editorWindowUrl, err => {
      if (err) throw err
    })
  })
}

const hasBackend = () => true

const updateEditorMenu = menu => Menu.setApplicationMenu(Menu.buildFromTemplate(menu))

//#endregion

//#region App events

/**
 * Event called when the app is ready
 */
app.on('ready', openSplash)

/**
 * This event is called on OSX when the user click on icon in the dock
 */
app.on('activate', (event, hasVisibleWindows) => {

  // If there aren't any open windows
  if (!hasVisibleWindows)
    openSplash()
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

//#endregion

//#region procedure call

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
  event.returnValue = hasBackend()
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

    global.articleSettings.savePath = path.normalize(savePath)

    RAJE_FS.saveAsArticle(global.articleSettings.savePath, arg.document)
      .then(message => {
        global.articleSettings.isNew = false
        global.articleSettings.folderName = path.parse(global.articleSettings.savePath).name

        updateEditorMenu(RAJE_MENU.getEditorMenu())

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

      updateEditorMenu(RAJE_MENU.getEditorMenu())

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

  if (typeof imagePath == 'undefined')
    return event.returnValue = null

  RAJE_FS.saveImageTemp(imagePath[0], global.articleSettings.savePath)
    .then(result => event.returnValue = result)
    .catch(error => event.returnValue = error)

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
    openEditor(arg.path)
    closeSplash()
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
  closeSplash()
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
 * 
 */
ipcMain.on('setSettings', (event, arg) => {
  global.setSettings(arg)
})

/**
 * 
 */
ipcMain.on('getSettings', event => {
  global.getSettings().then(settings => event.returnValue = settings)
})

//#endregion

//#region Global methods

/**
 * Send a message to the renderer process
 * Start the save as process
 */
global.executeSaveAs = function () {
  windowManager.get(RAJE_CONST.windows.editor).object.webContents.send('executeSaveAs')
}

/**
 * Send a message to the renderer process
 * Start the save process
 */
global.executeSave = function () {

  // If the article hasn't been saved yet, call saveAs
  if (global.articleSettings.isNew)
    windowManager.get(RAJE_CONST.windows.editor).object.webContents.send('executeSaveAs')

  // Or call save
  else
    windowManager.get(RAJE_CONST.windows.editor).object.webContents.send('executeSave')
}

/**
 * 
 */
global.updateClientContent = function () {
  windowManager.get(RAJE_CONST.windows.editor).object.webContents.send('updateContent')
}

/**
 * 
 */
global.newArticle = function () {
  openEditor(null)
  closeSplash()
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
    openEditor(localRootPath)
    closeSplash()
  } catch (exception) {}
}

/**
 * 
 */
global.sendNotification = function (message) {
  windowManager.get(RAJE_CONST.windows.editor).object.webContents.send('notify', message)
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

    updateEditorMenu(RAJE_MENU.getEditorMenu())
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

    updateEditorMenu(RAJE_MENU.getEditorMenu())
  })
}

/**
 * 
 * @param {*} callback 
 */
global.getUserStoredData = () =>
  new Promise((resolve, reject) =>
    RAJE_STORAGE.getGithubData()
    .then(data => resolve(data))
    .catch(error => reject(error))
  )




global.push = function () {
  RAJE_GITHUB.initRepo(global.articleSettings.savePath)
}


/**
 * 
 */
global.showSettings = () => {

  settingsWindowsUrl = url.format({
    pathname: path.join(__dirname, RAJE_CONST.files.settings),
    protocol: 'file:',
    slashes: true
  })

  windowManager.open(RAJE_CONST.windows.settings, RAJE_CONST.windows.settings, settingsWindowsUrl, false, {
    height: 400,
    width: 600,
    parent: windowManager.getCurrent(),
    movable: true,
    alwaysOnTop: true
  })
}

/**
 * 
 * @param {JSON} settings 
 */
global.setSettings = settings => {

  RAJE_STORAGE.setSettings(settings)
}

/**
 * 
 */
global.getSettings = () =>
  new Promise((resolve, reject) =>
    RAJE_STORAGE.getSettings()
    .then(data => resolve(data))
    .catch(error => reject(error))
  )

//#endregion