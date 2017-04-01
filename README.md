
[![Build Status](https://travis-ci.org/limpkin/mooltiapp.svg?branch=master)](https://travis-ci.org/limpkin/mooltiapp)

[![Build status](https://ci.appveyor.com/api/projects/status/nce8eenqf1wq9f92?svg=true)](https://ci.appveyor.com/project/limpkin/mooltiapp)

# Mooltiapp

Prerequisites - Linux
---------------------

Add NodeJs PPA:

    sudo apt-get install python-software-properties curl
    curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -

Install Node.js and NPM:

    sudo apt-get install nodejs

Install the required packages:

    sudo apt-get install libusb-1.0-0-dev libusb-1.0-0 libudev-dev git
    sudo npm i -g node-gyp node-pre-gyp electron

Prerequisites - Windows
-----------------------

- install node js at `https://nodejs.org/en/download/` (take current version)
- (from a shell with admin rights) `npm i -g node-gyp node-pre-gyp electron windows-build-tools`
- (standard shell, inside the mooltiapp folder) `npm install`
- when running `npm run ciprep` below, please do it in an administrative shell

Linux udev rules
----------------
Getting sudo access

    myuser@myusers-vubuntu:~$ sudo -s

User name is "myuser" on this machine, adding user myuser to group plugdev

    root@myusers-vubuntu:~# gpasswd -a myuser plugdev

Adding an udev rule

    root@myusers-vubuntu:~# echo "ATTRS{idVendor}==\"16d0\", ATTRS{idProduct}==\"09a0\", SYMLINK+=\"mooltipass\", MODE=\"0664\", GROUP=\"plugdev\"" > /etc/udev/rules.d/50-mooltipass.rules

Reloading the rules

    root@myusers-vubuntu:~# udevadm control --reload-rules

Unplug and replug your device. If the Mooltiapp still flickers or doesn't see the Mooltipass device, try logging off and logging back.

Prerequisites
-------------

Project uses native modules, and you need to prepare your environment for compiling them.
Please consult [Platform notes](DEVELOPMENT.md#platform-notes)

First steps
-----------
After cloning this repo, you should:

- `./mooltipass` must contain copy of `limpkin/mooltipass` repo, you can make symlink to your local copy
OR create shallow clone of `https://github.com/limpkin/mooltipass.git` into `./mooltipass`, use: `npm run getmainrepo`
- install npm dependencies: `npm i`
- add symlink to chrome_app and sync version: `npm run ciprep`

Running app
-----------

    npm start

Linux can expose weird behaviour, no showing tray icon etc. You may need to kill hanging electron processes in order to run the app in development mode. If no icon is present in the tray, you may try `sudo apt-get install libappindicator1`
It may be helpful to run app from desktop shortcut, more chances that tray icon will work in dev mode. 
Create it with `npm run desktopitem`. Your linux distro may have issues with displaying tray icon (like recent Ubuntu), 
make sure you checked for such issues in bugtracker and applied appropriate fixes.

Sometimes electron process may still run in background and it will prevent you from running app again.
You may need to terminate them, using something like `pkill -9 electron`

Building installer
------------------

    npm run build 

Alternatively you can run `npm run release` -- this will build and **publish** installers to github (as configured in electron-builder.json)

Warning!!!
----------

Remember - it's your duty to keep updated the `mooltipass` repo copy in related folder, git doesn't do it automatically. 
Whenever you need fresh `mooltipass`, run: 

    npm run subsync    

Yarn
----

I strongly recommend [yarn](https://yarnpkg.com/) instead of `npm` for faster modules operations, considering size of dependencies used.
You can safely replace `npm` with `yarn` in all commands in this guide. 
