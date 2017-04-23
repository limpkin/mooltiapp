'use strict'

const electron = require('electron')
const {app, Tray, dialog, Menu, systemPreferences} = electron

// Prevent objects being garbage collected
/** @type {Electron.BrowserWindow} */
let mainWindow = null
let tray = null

let shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  // This callback is guaranteed to be executed after the "ready" event of app gets emitted
  // https://electron.atom.io/docs/api/app/#appmakesingleinstancecallback
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

if (shouldQuit) {
  app.quit()
  return
}

const fs = require('fs')
const path = require('path')
const url = require('url')
const _merge = require('lodash/merge')

const windowStateKeeper = require('electron-window-state')
const autoUpdater = require('electron-updater').autoUpdater
const log = require('electron-log')

autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'error'
// autoUpdater.autoDownload = false
autoUpdater.autoDownload = true

// eslint-disable-next-line no-unused-vars
let isReadyToUpdate = false

// Arguable techniques
var techniques = {
  reloadAppOnCrash: !false, // If Chrome APP crashes, issue a reload
  writeAfterDisconnect: !false // Due to a bug in Node-HID, we need to write after a disconnect command in order to actually disconnect from the device
}

global.techniques = techniques

let isHidden = process.argv.includes('-m')

console.log('Starting mode:', isHidden ? 'minimized' : 'normal')

let isAutoStartEnabled = false
let LoginItem = app.getLoginItemSettings()
console.log('LoginItem', LoginItem)
isAutoStartEnabled = LoginItem.openAtLogin

// first run check
const firstRunFile = path.join(app.getPath('userData'), '.firstrun')
let isFirstRun = false

try {
  if(!fs.existsSync(firstRunFile)) throw new Error('ENOENT')
} catch (e) {
  // perform first run operations
  isFirstRun = true
  isHidden = true
  isAutoStartEnabled = true
  app.setLoginItemSettings({openAtLogin: isAutoStartEnabled, openAsHidden: true})
  fs.writeFileSync(firstRunFile, '{"done":true}', 'utf8')
}

const pjson = require('./package.json')
const appName = pjson.productName || pjson.name

// Use system log facility, should work on Windows too
// require('./lib/log')(pjson.productName || 'SkelEktron')

// Manage unhandled exceptions as early as possible
process.on('uncaughtException', (e) => {
  console.error(`Caught unhandled exception: ${e}`)
  dialog.showErrorBox('Caught unhandled exception', e.message || 'Unknown error message')
  app.quit()
})

// Load build target configuration file
try {
  let config = require('./config.json')
  _merge(pjson.config, config)
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

console.log(JSON.stringify(pjson.config))

// Adds debug features like hotkeys for triggering dev tools and reload
// (disabled in production, unless the menu item is displayed)
const isElectronDebugEnabled = pjson.config.debug || isDev || false
if (isElectronDebugEnabled) {
  require('electron-debug')({
    enabled: isElectronDebugEnabled
  })
}

app.setName(appName)

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
      'title': appName,
      'icon': path.join(__dirname, 'chrome_app', 'images', 'icons', 'AppIcon_128.png'),
      'show': false, // Hide your application until your page has loaded
      // 'showDevTools': true,
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

    // prevent changing title
    win.on('page-title-updated', event => event.preventDefault())

    win.loadURL(url.format({
      pathname: path.join(__dirname, pjson.config.url),
      protocol: 'file:',
      slashes: true
    }))

    win.on('closed', onClosed)

    win.on('show', e => { isHidden = false })
    win.on('hide', e => { isHidden = true })

    // Then, when everything is loaded, show the window and focus it so it pops up for the user
    // Yon can also use: win.webContents.on('did-finish-load')
    win.on('ready-to-show', () => {
      if (!isHidden) win.show()
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
      win.destroy()
      mainWindow = null
      if (techniques.reloadAppOnCrash) mainWindow = createMainWindow()
    })

    return win
  }

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      if (!techniques.reloadAppOnCrash) app.quit()
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

    tray = new Tray(getTrayIcon('disc.png'))

    const trayContextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: cmdShowApp
      },
      {
        label: 'Auto-start',
        type: 'checkbox',
        click: cmdToggleAutostart,
        checked: isAutoStartEnabled
      },
      {
        label: 'Quit',
        click: function () {
          app.isQuiting = true
          app.quit()
        }
      }
    ])

    tray.setToolTip(`Open or Quit ${appName}`)
    tray.setContextMenu(trayContextMenu)
    tray.on('double-click', cmdShowApp)

    global.changeTray = changeTray

    if (autoUpdater) autoUpdater.checkForUpdates()
  })

  app.on('will-quit', () => { })
}

function getTrayIcon (icon) {
  // path.join(__dirname, 'chrome_app', 'images', 'icons', 'icon_cross_16.png')
  console.log('getTrayIcon', icon)
  const iconmap = {
    'icon_cross_16.png': 'disc.png',
    'icon_normal_19.png': 'conn.png'
  }
  if (iconmap[icon]) return path.join(__dirname, 'img', iconmap[icon])
  return path.join(__dirname, 'img', icon)
}

// We can't call tray from running process, so we use this function to wrap it up
function changeTray (icon) {
  // icon_normal_19.png ~ icon_cross_16.png
  let iconPath = getTrayIcon(icon)
  // let iconPath = path.join(__dirname, 'chrome_app', 'images', 'icons', icon)
  // if (icon === 'icon_normal_19.png') iconPath = getThemedTrayIcon()
  // console.log('changeTray', icon, iconPath)
  if (tray) { tray.setImage(iconPath) }
}

function getThemedTrayIcon () {
  let style = 'tray.png'
  // https://electron.atom.io/docs/api/system-preferences/#systempreferencesisdarkmode-macos
  if (systemPreferences.isDarkMode()) style = 'tray@dark.png'
  return path.join(__dirname, 'img', style)
}

/**
 * @param menuItem Electron.MenuItemOptions
 * @param browserWindow Electron.BrowserWindow
 * @param event Event
 */
function cmdToggleAutostart (menuItem, browserWindow, event) {
  isAutoStartEnabled = !isAutoStartEnabled
  let LoginItemSettings = {
    openAtLogin: isAutoStartEnabled,
    openAsHidden: true
  }
  app.setLoginItemSettings(LoginItemSettings)
  menuItem.checked = isAutoStartEnabled
}

function cmdShowApp () {
  if (mainWindow) {
    mainWindow.show()
    if (process.platform === 'darwin') app.dock.show()
  }
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
