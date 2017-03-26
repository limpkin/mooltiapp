
[![Build Status](https://travis-ci.org/limpkin/mooltiapp.svg?branch=master)](https://travis-ci.org/limpkin/mooltiapp)

[![Build status](https://ci.appveyor.com/api/projects/status/nce8eenqf1wq9f92?svg=true)](https://ci.appveyor.com/project/limpkin/mooltiapp)

# Mooltiapp

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
