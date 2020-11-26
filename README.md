# MicroPython WebREPL in TypeScript

Goal: easy to use, async WebREPL with types, for websites and Node.js apps.

### Functionality

Basic async functions:
- `connect(hostname, password)`
- `close()`
- `runReplCommand(cmd: string)` ... run a Python command (should also lude multi-line "paste", note that original webrepl doesn't send ge clipboards)
- `wsSendData(data: string | ArrayBuffer)`

webrepl protocol commands:
- `GET_VER()`
- `GET_FILE(filename: string)`
- `PUT_FILE(filename: string, targetFilename?: string)`

helper:
- `listFiles()`

References:

* https://github.com/micropython/webrepl
* Original JS implementation: https://github.com/micropython/webrepl/blob/master/webrepl.html

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
