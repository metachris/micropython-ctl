# TypeScript MicroPython REPL and WebREPL Interface

* TypeScript/JavaScript/Node.js library to interface with MicroPython devices over a serial and network connection (REPL and WebREPL), fully async (you can await connect or executing REPL commands)
* Command-line utility: `mctl`

Goals:

* Make it easy to develop apps and webapps to interface with MicroPython devices
* Making terminal interaction more friendly and customizable

Inspiration:

* https://github.com/micropython/webrepl ([original JS implementation](https://github.com/micropython/webrepl/blob/master/webrepl.html))
* https://github.com/scientifichackers/ampy/blob/master/ampy/pyboard.py
* https://pycopy.readthedocs.io/en/latest/esp32/quickref.html
* https://github.com/micropython/micropython/pull/6375/files (mpr: fs mount PR)

Take a look at the examples!

### Functionality

Basic async functions:
- `connectSerial(path: string)`
- `connectNetwork(host: string, password: string)`
- `close()`
- `listFiles(directory = "/", recursive = false)`
- `runScript(cmd: string)` ... run a Python script (will execute in RAW mode)

webrepl protocol commands:
- `GET_VER()`
- `GET_FILE(filename: string)`
- `PUT_FILE(filename: string, targetFilename?: string)`

helper:
- `listFiles()`


---

Usage:

```js
import { WebREPL } from 'micropython-webrepl'

const webrepl = new WebREPL()

// Connect to webrepl over network
await webrepl.connect('IP_ADDRESS', 'REPL_PASSWORD')
console.log('WebREPL connected')

// Run a REPL command and capture the output
const output = await webrepl.runReplCommand('import os; os.listdir()')
console.log('Run command output:', output)

// List all files (as a list of filenames)
const files = await webrepl.listFiles()
console.log('Files:', files)
```

See more examples in `/examples/`. You can run them with `ts-node`:

```shell
$ yarn ts-node examples/terminal.ts
```

---

Future work:

* Support new raw-paste mode: https://github.com/micropython/micropython/blob/master/docs/reference/repl.rst#raw-mode-and-raw-paste-mode (only in master, should be part of MicroPython 1.14)
