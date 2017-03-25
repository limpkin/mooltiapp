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

// let ver = '6.4.0' // just to test autoupdate
// ln -siv ../mooltipass/chrome_app

let actionList = {
  linkapp: () => {
    // child_process.spawnSync('ln', ['-s', '../mooltipass/chrome_app'], {cwd: appDir})
    fs.symlinkSync(chromeAppDir, path.join(appDir, 'chrome_app'))
  },
  appdeps: () => child_process.spawnSync('yarn', ['install', '--production'], {cwd: chromeAppDir}),
  syncver: () => {
    let pj = require(appJsonPath)
    pj.version = chromeAppManifest.version
    return fs.writeFileSync(appJsonPath, JSON.stringify(pj, null, 2), 'utf8')
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
