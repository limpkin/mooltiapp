
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
After cloning this repo, you should run:
    
    git submodule update --init
    npm i
    npm run ciprep

This will:
- pull submodule, 
- install npm dependencies, 
- add symlink to chrome_app and sync version

Running app
-----------

    npm start

Building installer
------------------

    npm run release

Warning!!!
----------

Remember - it's your duty to keep updated the `mooltipass` submodule, git doesn't do it automatically. 
Whenever you need fresh `mooltipass`, run: 

    git submodule update
    
And sync app version with chrome_app:
    
    npm run sync

Or use this convenient script to perform all above:

    npm run subsync    

I strongly recommend [yarn](https://yarnpkg.com/) instead of `npm` for faster modules operations, considering size of dependencies used.
You can safely replace `npm` with `yarn` in all commands in this guide. 
