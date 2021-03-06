# MiniforgeJS

![npm](https://img.shields.io/npm/v/miniforge-js)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/miniforge-js)
![GitHub top language](https://img.shields.io/github/languages/top/aspiesoft/miniforge-js)
![NPM](https://img.shields.io/npm/l/miniforge-js)

![npm](https://img.shields.io/npm/dw/miniforge-js)
![npm](https://img.shields.io/npm/dm/miniforge-js)

[![paypal](https://img.shields.io/badge/buy%20me%20a%20coffee-paypal-blue)](https://buymeacoffee.aspiesoft.com)

Minify and Forge your node.js files for production.

- Tracks down local required files, and adds them to the parent file as a self running function.

- Minifies each file individually, and then as a whole.

- Allows your file to run standalone, and not depend on miniforge-js to run.

Optional:

- Compresses the file, and decompress it at runtime
- Encrypts the file, and decrypts it at runtime

This module Never uses eval.
Instead, the file is pushed into the nodejs module object, as a way to run the file as a string after decompression.
This is generating a virtual file, so no file writes are needed at runtime.

This module runs a minified version of itself, minified using miniforge-js. (self minified)

## What's New

- Added zlib compression
- Top level comments now stay with compressed file
- Added option to avoid dependencies on file compression

## Installation

```shell script
npm install @aspiesoft/miniforge-js

# or install as a dev dependency
npm install @aspiesoft/miniforge-js -D

# or install global for cli
npm install @aspiesoft/miniforge-js -g
```

## Setup

```js
const miniforge = require('@aspiesoft/miniforge-js');

// optional
miniforge.rootDir(__dirname);
```

## Usage

```js
miniforge.build('./app.js', {/* options */});
// output creates file: app.build.js

miniforge.build('./app.js', {encrypt: true});
// output will also create key file: app.build.keys

// running files
const app = require('./app.build.js');

// in some cases (depending on options), you may have to require the file with this module
const app = miniforge('./app.build.js', true||false/*optional (default: false) (if true, will avoid throwing errors on fail*/);

// you could also change the var name if you want
const requireMini = require('miniforge-js');

const app = requireMini('./app.build.js');
```

## This module uses the terser module for magnifying

This module sets some of its own defaults for terser, but you can change its options if you want.
You can find terser options [here](https://www.npmjs.com/package/terser#api-reference)

```js
miniforge.build('./app.js', {minify: {/* terser minify options */}});
```

## Options

```js
// with defaults (the first string ('./app.js') has no default and is required)
miniforge.build('./app.js', {
    encrypt: false, /* encrypt the files code */
    compress: true, /* true for default (currently zlib) || 'lzutf8' for old lzutf8 method || false to disable */
    standAlone: true, /* allow the file to run without miniforge-js as a dependency */
    avoidDependencies: true, /* avoid requiring external dependencies for compressed files */
    minify: {}, /* set minify options for the terser module */
    outputNameMin: false, /* will write output to "filename.min.js" instead of "filename.build.js" (will also use min.keys instead of build.keys) */
    output: undefined, /* (type: string) optional path to an output file to use instead of the default path */
    root: undefined, /* (type: string) set the root dir for build (can replace miniforge.rootDir(__dirname); for build, but its still required for miniforge('./app.js'); function to run) */
});
```

## CLI

You can use cli scripts as shown

```shell script
# for a list of commands
miniforge-js -h
```

**Note: if encrypt or compress are used, and standAlone is false, you will need to use miniforge('./app.js'); method to require the file.**

If standAlone, the file (when ran/imported) will warn the user what modules (if not installed) are needed to run it.
