const fs = require('fs')
const path = require('path')
// eslint-disable-next-line camelcase
const child_process = require('child_process')

const cmdLine = process.argv.slice(2)

const chromeAppDir = path.join(__dirname, 'mooltipass', 'chrome_app')
const appDir = path.join(__dirname, 'app')
const appJsonPath = path.join(appDir, 'package.json')

// mooltipass/chrome_app/manifest.json
const chromeAppManifest = require(path.join(chromeAppDir, 'manifest.json'))
const builderConfig = require('./electron-builder.json')
let pjson = require(appJsonPath)
pjson.version = chromeAppManifest.version

// ln -siv ../mainrepo/wrapped_app

let actionList = {
  linkapp: () => {
    // child_process.spawnSync('ln', ['-s', '../mooltipass/chrome_app'], {cwd: appDir})
    fs.symlinkSync(chromeAppDir, path.join(appDir, 'chrome_app'))
  },
  appdeps: () => child_process.spawnSync('yarn', ['install', '--production'], {cwd: chromeAppDir}),
  syncver: () => {
    return fs.writeFileSync(appJsonPath, JSON.stringify(pjson, null, 2), 'utf8')
  },
  desktopitem: () => {
    const electronBinPath = require('electron')
    let desktopItem = `[Desktop Entry]
Name=${pjson.name}_DEVMODE
Comment=${pjson.description}
Exec=${electronBinPath} ${appDir}
Terminal=false
Type=Application
Icon=${path.join(__dirname, 'build', 'icon.png')}
Categories=${builderConfig.linux.category};`
    let target = path.join(path.resolve('~/Desktop'), 'mooltiappdev.desktop')
    fs.writeFileSync(target, desktopItem, {encoding: 'utf8', mode: 0o777})
  }
}

cmdLine.map(action => {
  if (/-h|--help|help/.test(action)) {
    console.log(Object.keys(actionList).join('\n'))
  }
  if (typeof actionList[action] === 'function') {
    try {
      actionList[action]()
      console.log('DONE:', action)
    } catch (e) {
      console.error(e.message)
    }
  }
  // return undefined
})
