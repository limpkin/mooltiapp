## Setup

Repo layout:

	build/ - resources for installer, don't change file names names there
	electron-builder.json - main build config
	butil.js - fetches version from for build, and installs app/package.json "dependencies"
	.travis.yml - CI config
	appveyor.yml - CI config
	app/
	app/chrome_app links to -> ../../chrome_app/
	mooltipass/ - git submodule, referencing github.com/limpkin/mooltipass repo

## High level workflow

1) You push to repo, (tip: add [ci skip] in commit msg to skip build)

2) git hook activates CI, and CI performs build 

3) After successful build CI drafts new release in github and uploads installers, mac and linux from Travis and windows one from AppVeyor
( you'll see new draft here: https://github.com/...repo.../releases )

4) You wait till all installers get into draft and press "Publish release"

Need to open corresponding draft in: https://github.com/...repo.../releases
Press "Edit" near relevant draft, make sure you see all needed installers uploaded by CI, and press "Publish release" below

So manual work is push commit, have lunch, coffee and press "Publish" button.
Travis OSX builds can spend hour(s) in queue.

## Configuring CI

You must provide certain environment variables for github publishing and code signing

	GH_TOKEN = github token, for publishing (public_repo permission)
	CSC_LINK = Certificate converted to base64-encoded string, or url to cert (*.p12 or *.pfx file)
	CSC_KEY_PASSWORD = The password to decrypt the certificate given in CSC_LINK

#### Travis CI - builds OSX and Linux installers
Define vars at: relevant repo page / "More options" / "Settings"

#### AppVeyor CI - Windows NSIS installer
Define vars at: SETTINGS / Environment / Environment variables, Add variable

## Code signing

### Windows

To sign an app on Windows, there are two types of certificates: **EV Code Signing Certificate** and
**Code Signing Certificate**. Both certificates work with auto-update. The regular (and often cheaper)
Code Signing Certificate shows a warning during installation that goes away once enough users installed your application
and you've built up trust.

For CI you can use only regular **Code Signing Certificate**, because EV Certificate is bound to a physical USB dongle.

SSL certificate used for website is not suitable for signing apps.

See [Get a code signing certificate](https://msdn.microsoft.com/windows/hardware/drivers/dashboard/get-a-code-signing-certificate) for Windows.
And this may be useful: https://cheapsslsecurity.com/#ProtectYourCode

### MacOS

Mac build requires Apple-issued Developer ID certificate, you must be member of https://developer.apple.com/programs/whats-included/
to receive one.

#### How to Export Certificate on macOS

1. Open Keychain.
2. Select `login` keychain, and `My Certificates` category.
3. Select all required certificates (hint: use cmd-click to select several):
	* `Developer ID Application:` to sign app for macOS.
	* `3rd Party Mac Developer Application:` and `3rd Party Mac Developer Installer:` to sign app for MAS (Mac App Store).
	* `Developer ID Application:` and `Developer ID Installer` to sign app and installer for distribution outside of the Mac App Store.

	Please note – you can select as many certificates, as need. No restrictions on electron-builder side.
	All selected certificates will be imported into temporary keychain on CI server.
4. Open context menu and `Export`.

To encode file to base64 (macOS/linux): `base64 -i yourFile.p12 -o envValue.txt`

## WARNING

app/package.json "dependencies" will get into installer, so please put irrelevant ones into "devDependencies", which is ignored by builder.

## Platform notes

### Mac OS X 

You'll need Xcode

### Windows XP, 7, 8, 10

You'll need Visual C++ compiler and Python 2.7, easiest way is to get them via:

    npm i -g windows-build-tools

Add %USERPROFILE%\.windows-build-tools\python27 to PATH, like PowerShell: 
    
    $env:Path += ";$env:USERPROFILE\.windows-build-tools\python27"

### Linux

For install builder
    
    sudo apt-get install --no-install-recommends -y icnsutils graphicsmagick xz-utils
    
For native modules
    
    npm i -g node-gyp node-pre-gyp
    
Add the udev rule: see https://www.themooltipass.com/udev_rule.txt

(from manual)
```
    Linux (kernel 2.6+) : install examples shown for Ubuntu

    Compilation tools: apt install build-essential git
    gcc-4.8+: apt install gcc-4.8 g++-4.8 && export CXX=g++-4.8
    libusb-1.0-0 w/headers:sudo apt install libusb-1.0-0 libusb-1.0-0-dev
    libudev-dev: (Fedora only) yum install libusbx-devel
```

but generally you may need just:

    sudo apt install libusb-1.0-0 libusb-1.0-0-dev
    sudo apt-get install libudev-dev

#### node-hid

to get all device info you may want to compile it with hidraw driver

easiest way is to manually change this file in you modules dir
...node_modules/node-hid/binding.gyp

replace 'libusb' at very beginning
```  
 'variables': {
         'driver%': 'libusb'
     },
```
with 'hidraw'
```  
 'variables': {
         'driver%': 'hidraw'
     },
```
and do electron-rebuild as usual, then copy new binary to app dir where needed
