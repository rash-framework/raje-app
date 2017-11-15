![RAJE icon](https://github.com/rash-framework/raje-app/blob/master/build/icon.png?raw=true)

# RAJEApp is a multi-platform standalone software based on raje-core

RAJE is a WYSIWYG word processor based on Electron and the node.js framework in order to create a multi-platform software.

With RAJE users are allowed to create and modify RASH documents

## How to contribute

1. `npm install` inside the this folder to download the packaging modules
2. `cd app && npm install` in order to download all modules needed by the software itself

## Integrate nodegit

1. Install nodegyp globally
2. Run `npm i nodegit [--save]`
3. Move inside the nodegit folder in node_modules
4. Run `HOME=~/.electron-gyp node-gyp rebuild --target=ELECTRON_VERSION --arch=x64 --dist-url=https://atom.io/download/electron` where ELECTRON_VERSION is the selected version (eg. 1.8.2-beta.2 or 1.7.9)
