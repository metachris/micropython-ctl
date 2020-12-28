# TypeScript MicroPython REPL and WebREPL Interface

Interface with MicroPython devices over a serial and network connection (REPL and WebREPL)

* TypeScript library for websites and Node.js
* Fully async (you can await `connect`,  executing REPL commands, etc.)
* Command-line utility: `mctl`
* Functionality:
  * Connect and disconnect
  * Run Python script and capture output
  * List files
  * Upload and download files

Examples:

* [examples/basic.ts](https://github.com/metachris/micropython-ctl/blob/master/examples/basic.ts)
* [examples/web-example.html](https://github.com/metachris/micropython-ctl/blob/master/examples/web-example.html)
* [examples/cli.ts](https://github.com/metachris/micropython-ctl/blob/master/examples/cli.ts) (you can run it with `yarn cli`)


# Usage Examples

## Browser

You can include the latest release via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/micropython-ctl@1.0.1/dist-browser/main.js"></script>
```

Example:

* See the code in [examples/web-example.html](https://github.com/metachris/micropython-ctl/blob/master/examples/web-example.html)
* Live at https://metachris.github.io/micropython-ctl/web-example.html

Notes:

* The code is similar as in Node.js, but without serial interface (Browsers don't allow access to USB/serial ports).
* You can enable debug output by opening the console and entering `window.DEBUG = 1`


## Node.js

```js
import { MicroPythonDevice } from 'micropython-ctl'

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

See more examples in `/examples/`. You can run them with `ts-node`:

```shell
$ yarn ts-node examples/terminal.ts
```

---


#### Inspiration

* https://github.com/micropython/webrepl ([original JS implementation](https://github.com/micropython/webrepl/blob/master/webrepl.html))
* https://github.com/scientifichackers/ampy/blob/master/ampy/pyboard.py
* https://pycopy.readthedocs.io/en/latest/esp32/quickref.html
* https://github.com/micropython/micropython/pull/6375/files (mpr: fs mount PR)


#### Future work

* Serial interfacing is currently broken (due to focus on making it browser compatible. Will be fixed shortly!)
* Upload & download files
* Run Python script and receive output (don't wait for finishing) (Note: not sure it's needed, don't rush into implementing)
* Support new raw-paste mode: https://github.com/micropython/micropython/blob/master/docs/reference/repl.rst#raw-mode-and-raw-paste-mode (only in master, should be part of MicroPython 1.14)
