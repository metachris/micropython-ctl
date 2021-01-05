# TypeScript MicroPython Interface

A library to interface with MicroPython devices over serial and network connections (REPL and WebREPL)

* Easily build websites/webapps and Node.js programs that talk with MicroPython devices
* Typed and fully async (you can use `await` with `connect`,  executing REPL commands, etc.)
* Tested with ESP32, should also work with ESP8266, perhaps others
* Functionality:
  * Connect over network and serial interface
  * Run Python scripts and await the output
  * List files, upload and download files
  * Terminal (REPL) interaction
  * [`mctl`](https://github.com/metachris/micropython-ctl/blob/master/examples/mctl.ts) command line utility
* Main code file: [`main.ts`](https://github.com/metachris/micropython-ctl/blob/master/src/main.ts)
* Links: [Github](https://github.com/metachris/micropython-ctl/settings), [Documentation](https://metachris.github.io/micropython-ctl/), [npm package](https://www.npmjs.com/package/micropython-ctl)


# Usage

```js
const micropython = new MicroPythonDevice()

// Connect to micropython device over network
await micropython.connectNetwork('DEVICE_IP', 'WEBREPL_PASSWORD')

// Or connect to micropython device over serial interface
await micropython.connectSerial('/dev/ttyUSB0')

// Run a Python script and capture the output
const output = await micropython.runScript('import os; print(os.listdir())')
console.log('runScript output:', output)

// List all files in the root
const files = await micropython.listFiles()
console.log('files:', files)

// Set a terminal (REPL) data handler, and send data to the REPL
micropython.onTerminalData = (data) => process.stdout.write(data)
micropython.sendData('\x02')  // Ctrl+B to enter friendly repl and print version
```

Note on network connection: To access the webrepl over the network, you need to enable it first through the serial REPL: `import webrepl_setup` (see [docs](https://docs.micropython.org/en/latest/esp8266/tutorial/repl.html#webrepl-a-prompt-over-wifi)). Also, make sure you can ping the device first.


**Code examples:**

* [examples/basic.ts](https://github.com/metachris/micropython-ctl/blob/master/examples/basic.ts) (run with `yarn ts-node examples/basic.ts`)
* [examples/web-example.html](https://github.com/metachris/micropython-ctl/blob/master/examples/web-example.html) (open the file in a browser, or view it [live here](http://current.at/micropython-ctl/examples/web-example.html))
* [examples/web-example2-terminal.html](https://github.com/metachris/micropython-ctl/blob/master/examples/web-example2-terminal.html) (open the file in a browser, or view it [live here](http://current.at/micropython-ctl/examples/web-example2-terminal.html))
* [examples/mctl.ts](https://github.com/metachris/micropython-ctl/blob/master/examples/mctl.ts) (run with `yarn mctl`)
* [examples/terminal.ts](https://github.com/metachris/micropython-ctl/blob/master/examples/terminal.ts) (run with `yarn examples/terminal.ts`)

## Browser / Webapps

In websites/webapps, simply include the latest release via CDN (~13kb gzipped):

```html
<script src="https://cdn.jsdelivr.net/npm/micropython-ctl@latest/dist-browser/main.js"></script>
```

Then you can use it like this:

```js
const micropython = new MicroPythonCtl.MicroPythonDevice()
await micropython.connectNetwork(host, password)
```

**Usage example:**

* [examples/web-example.html](https://github.com/metachris/micropython-ctl/blob/master/examples/web-example.html#L89-L113) - [live here](http://current.at/micropython-ctl/examples/web-example.html)
* [examples/web-example2-terminal.html](https://github.com/metachris/micropython-ctl/blob/master/examples/web-example2-terminal.html#L112-L130) - [live here](http://current.at/micropython-ctl/examples/web-example2-terminal.html)

**Notes:**

* Browsers don't allow access to USB/serial ports.
* You can enable debug output by opening the console and entering `window.DEBUG = 1`
* You can download the zipped bundle here: [main.js.gz](https://cdn.jsdelivr.net/npm/micropython-ctl@latest/dist-browser/main.js.gz)

## Node.js

Installation:

```shell
# If you use yarn
yarn add micropython-ctl

# Alternatively, if you use npm
npm install micropython-ctl
```

Usage:

```js
// Node.js with TypeScript:
import { MicroPythonDevice } from 'micropython-ctl'

// Node.js without TypeScript:
// const MicroPythonDevice = require('micropython-ctl').MicroPythonDevice

(async () => {
  const micropython = new MicroPythonDevice()

  // Connect to micropython device
  await micropython.connectNetwork('YOUR_IP', 'WEBREPL_PASSWORD')
  // await micropython.connectSerial('/dev/ttyUSB0')

  // Run a Python script and capture the output
  const output = await micropython.runScript('import os; print(os.listdir())')
  console.log('runScript output:', output)

  // List all files in the root
  const files = await micropython.listFiles()
  console.log('files:', files)

  // Close
  await micropython.close()
})()
```

## Examples

Find more examples in [`/examples/`](https://github.com/metachris/micropython-ctl/tree/master/examples). You can run them like this: `yarn ts-node examples/basic.ts`

* [examples/basic.ts](https://github.com/metachris/micropython-ctl/blob/master/examples/basic.ts) (run with `yarn ts-node examples/basic.ts`)
* [examples/web-example.html](https://github.com/metachris/micropython-ctl/blob/master/examples/web-example.html) (open the file in a browser, or view it [live here](http://current.at/micropython-ctl/examples/web-example.html))
* [examples/web-example2-terminal.html](https://github.com/metachris/micropython-ctl/blob/master/examples/web-example2-terminal.html) (open the file in a browser, or view it [live here](http://current.at/micropython-ctl/examples/web-example2-terminal.html))
* [examples/mctl.ts](https://github.com/metachris/micropython-ctl/blob/master/examples/mctl.ts) (run with `yarn mctl`)
* [examples/terminal.ts](https://github.com/metachris/micropython-ctl/blob/master/examples/terminal.ts) (run with `yarn examples/terminal.ts`)


## Building the code

```shell
$ git clone https://github.com/metachris/micropython-ctl.git
$ cd micropython-ctl
$ yarn
$ yarn build
```

---

Enjoy and do cool things with this code! 🚀

---

## Reach out

I'm happy about feedback, please reach out:

* chris@linuxuser.at
* https://twitter.com/metachris


## Inspiration

* https://github.com/micropython/webrepl ([original JS implementation](https://github.com/micropython/webrepl/blob/master/webrepl.html))
* https://github.com/scientifichackers/ampy/blob/master/ampy/pyboard.py
* https://pycopy.readthedocs.io/en/latest/esp32/quickref.html
* https://github.com/micropython/micropython/pull/6375/files (mpr: fs mount PR)


## Future work

* Upload & download files

Maybe (not sure it's needed, don't rush into implementing):

* Vue.js example with attaching the MicroPythonDevice instance to window, so one instance can live across code hot reloads :) (almost done)
* A slim version for the browser with minimal footprint (only core code, no listfiles etc.)
* Allow receiving output of running Python script (don't wait for finishing)
* Support new raw-paste mode: https://github.com/micropython/micropython/blob/master/docs/reference/repl.rst#raw-mode-and-raw-paste-mode (only in master, should be part of MicroPython 1.14)

---

## Release process

Help for writing release notes: https://github.com/metachris/micropython-ctl/compare

```shell
# Update CHANGELOG
vi CHANGELOG.md

# make sure all is committed in git
git status

# update version number and create a git tag
yarn version

# create the builds for node and browser
./build.sh

# publish
yarn publish

# push to git
git push && git push --tags
```

Purge CDN cache: https://purge.jsdelivr.net/npm/micropython-ctl@latest

Update [live web-example.html](http://current.at/micropython-ctl/web-example.html) with code from Github `master` branch:

```
ssh nova "cd /server/websites/current.at/micropython-ctl && git pull"
```
