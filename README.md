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

Take a look at the examples:

* [examples/basic.ts](https://github.com/metachris/micropython-ctl/blob/master/examples/basic.ts)
* [examples/cmd.ts](https://github.com/metachris/micropython-ctl/blob/master/examples/cmd.ts)
* [examples/website.html](https://github.com/metachris/micropython-ctl/blob/master/examples/website.html)


### Usage Examples

#### Node.js

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

#### Browser

Similar as in Node.js, but without serial interface (Browsers don't allow access to USB/serial ports).

See [examples/website.html](https://github.com/metachris/micropython-ctl/blob/master/examples/website.html)

Note: In the browser, you can enable debug output by opening the console and entering `window.DEBUG = 1`

---


Inspiration:

* https://github.com/micropython/webrepl ([original JS implementation](https://github.com/micropython/webrepl/blob/master/webrepl.html))
* https://github.com/scientifichackers/ampy/blob/master/ampy/pyboard.py
* https://pycopy.readthedocs.io/en/latest/esp32/quickref.html
* https://github.com/micropython/micropython/pull/6375/files (mpr: fs mount PR)


Future work:

* Support new raw-paste mode: https://github.com/micropython/micropython/blob/master/docs/reference/repl.rst#raw-mode-and-raw-paste-mode (only in master, should be part of MicroPython 1.14)
