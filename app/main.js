'use strict'

const path = require('path')
const url = require('url')
const _ = require('lodash')

const electron = require('electron')
const {app, Tray, dialog, Menu} = electron
// const ipc = electron.ipcMain

const windowStateKeeper = require('electron-window-state')
const autoUpdater = require('electron-updater').autoUpdater
const log = require('electron-log')

autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'
// autoUpdater.autoDownload = false
autoUpdater.autoDownload = true

// eslint-disable-next-line no-unused-vars
let isReadyToUpdate = false

// Prevent objects being garbage collected
/** @type {Electron.BrowserWindow} */
let mainWindow = null
/** @type {Electron.Tray} */
var tray = null

const pjson = require('./package.json')

// Use system log facility, should work on Windows too
require('./lib/log')(pjson.productName || 'SkelEktron')

// Manage unhandled exceptions as early as possible
process.on('uncaughtException', (e) => {
  console.error(`Caught unhandled exception: ${e}`)
  dialog.showErrorBox('Caught unhandled exception', e.message || 'Unknown error message')
  app.quit()
})

let shouldQuit = makeSingleInstance()
if (shouldQuit) {
  app.quit()
}

// Load build target configuration file
try {
  let config = require('./config.json')
  _.merge(pjson.config, config)
} catch (e) {
  console.warn('No config file loaded, using defaults')
}

const isDev = (require('electron-is-dev') || pjson.config.debug)
global.appSettings = pjson.config

if (isDev) {
  console.info('Running in development')
} else {
  console.info('Running in production')
}

console.debug(JSON.stringify(pjson.config))

// Adds debug features like hotkeys for triggering dev tools and reload
// (disabled in production, unless the menu item is displayed)
const isElectronDebugEnabled = pjson.config.debug || isDev || false
if (isElectronDebugEnabled) {
  require('electron-debug')({
    enabled: isElectronDebugEnabled
  })
}

app.setName(pjson.productName || 'Mooltipass')

initialize()

function initialize () {
  function onClosed () {
    // Dereference used windows
    // for multiple windows store them in an array
    mainWindow = null
  }

  function createMainWindow () {
    // Load the previous window state with fallback to defaults
    let mainWindowState = windowStateKeeper({
      defaultWidth: 820,
      defaultHeight: 620,
      resizable: false
    })

    const win = new electron.BrowserWindow({
      'width': mainWindowState.width,
      'height': mainWindowState.height,
      'x': mainWindowState.x,
      'y': mainWindowState.y,
      'title': app.getName(),
      'icon': path.join(__dirname, 'chrome_app', 'images', 'icons', 'AppIcon_128.png'),
      'show': false, // Hide your application until your page has loaded
      'webPreferences': {
        'nodeIntegration': pjson.config.nodeIntegration || true, // Disabling node integration allows to use libraries such as jQuery/React, etc
        'preload': path.join(__dirname, 'preload.js')
      }
    })

    // works only on Windows and Linux
    win.setMenu(null)
    win.setResizable(false)
    win.setSize(820, 620)

    // Let us register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    mainWindowState.manage(win)

    // EXPERIMENTAL: Minimize to tray
    win.on('minimize', function (event) {
      event.preventDefault()
      win.hide()
    })

    // EXPERIMENTAL: Minimize to tray
    win.on('close', function (event) {
      if (!app.isQuiting) {
        event.preventDefault()
        win.hide()
        if (process.platform === 'darwin') app.dock.hide()
      }
      return false
    })

    win.loadURL(url.format({
      pathname: path.join(__dirname, pjson.config.url),
      protocol: 'file:',
      slashes: true
    }))

    win.on('closed', onClosed)

    // Then, when everything is loaded, show the window and focus it so it pops up for the user
    // Yon can also use: win.webContents.on('did-finish-load')
    win.on('ready-to-show', () => {
      win.show()
      win.focus()
    })

    win.on('unresponsive', function () {
      // In the real world you should display a box and do something
      console.warn('The windows is not responding')
    })

    win.webContents.on('did-fail-load', (error, errorCode, errorDescription) => {
      var errorMessage

      if (errorCode === -105) {
        errorMessage = errorDescription || '[Connection Error] The host name could not be resolved, check your network connection'
        console.log(errorMessage)
      } else {
        errorMessage = errorDescription || 'Unknown error'
      }

      error.sender.loadURL(`file://${__dirname}/error.html`)

      win.webContents.on('did-finish-load', () => {
        win.webContents.send('app-error', errorMessage)
      })
    })

    win.webContents.on('crashed', () => {
      // In the real world you should display a box and do something
      console.error('The browser window has just crashed')
    })

    return win
  }

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    setTimeout(function () {
      if (!mainWindow) {
        mainWindow = createMainWindow()
      }
    }, 500)
  })

  app.on('ready', () => {
    mainWindow = createMainWindow()

    tray = new Tray(path.join(__dirname, 'chrome_app', 'images', 'icons', 'icon_cross_16.png'))

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: cmdShowApp
      },
      {
        label: 'Quit',
        click: function () {
          app.isQuiting = true
          app.quit()
        }
      }
    ])

    tray.setToolTip('Open or Quit MooltiApp')
    tray.setContextMenu(contextMenu)
    tray.on('double-click', cmdShowApp)

    // We can't call tray from running process, so we use this function to wrap it up
    function changeTray( icon ) {
      // icon_normal_19.png ~ icon_cross_16.png 
      tray.setImage(path.join(__dirname, 'chrome_app', 'images', 'icons', icon));
    }

    global.changeTray = changeTray


    autoUpdater.checkForUpdates()
  })

  app.on('will-quit', () => { })
}

function cmdShowApp () {
  if (mainWindow) {
    mainWindow.show()
    if (process.platform === 'darwin') app.dock.show()
  }
}

// Make this app a single instance app.
//
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
//
// Returns true if the current version of the app should quit instead of
// launching.
function makeSingleInstance () {
  return app.makeSingleInstance(() => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

autoUpdater.on('update-downloaded', (event, info) => {
  // log.info('@update-downloaded@\n', info, event)
  isReadyToUpdate = true
  // Ask user to update the app
  dialog.showMessageBox({
    type: 'question',
    buttons: ['Install and Relaunch', 'Later'],
    defaultId: 0,
    message: 'A new version of ' + app.getName() + ' has been downloaded',
    detail: 'It will be installed when you restart the application'
  }, response => {
    if (response === 0) {
      setTimeout(() => autoUpdater.quitAndInstall(), 7)
    }
  })
})
