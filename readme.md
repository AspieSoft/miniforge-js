## MiniforgeJS

![npm](https://img.shields.io/npm/v/miniforge-js)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/miniforge-js)
![GitHub top language](https://img.shields.io/github/languages/top/aspiesoft/miniforge-js)
![NPM](https://img.shields.io/npm/l/miniforge-js)

![npm](https://img.shields.io/npm/dw/miniforge-js)
![npm](https://img.shields.io/npm/dm/miniforge-js)
![GitHub last commit](https://img.shields.io/github/last-commit/aspiesoft/miniforge-js)

[![paypal](https://img.shields.io/badge/buy%20me%20a%20coffee-paypal-blue)](http://buymeacoffee.aspiesoft.com/)

Minify and Forge your node.js files for production.

 - Tracks down local required files, and adds them to the parent file as a self running function.

 - Minifies each file individually, and then as a whole.

Optional:
 - Compresses the file, and decompress it at runtime
 - Encrypts the file, and decrypts it at runtime

This module Never uses eval.
Instead, the file is pushed into the nodejs module object, as a way to run the file as a string after decompression.
This is generating a virtual file, so no file writes are needed at runtime.

## Installation

```shell script
npm install miniforge-js
```

## Setup

```js
const miniforge = require('miniforge-js');

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
    encrypt: false,
    compress: true,
    standAlone: true,
    minify: {},
    outputNameMin: false, /* will write output to "filename.min.js" instead of "filename.build.js" (will also use min.keys instead of build.keys) */
    output: undefined, /* (type: string) optional path to an output file to use instead of the default path */
});
```

**Note: if encrypt or compress are used, and standAlone is false, you will need to use miniforge('./app.js'); method to require the file.**

Even if standAlone:
 - If compress is used, lzutf8 module is required.
 - If encrypt is used, crypto-js module is required

If standAlone, the file will warn the user what modules are needed to run it, if not installed when the file is required.
