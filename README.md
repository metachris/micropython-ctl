MicroPython WebREPL implementation

Goal: easy to use, async WebREPL. For websites and Node.js apps.

### Functionality

Basic functions:
- `connect(hostname, password)`
- `disconnect()`
- `websocketSendData(data: string | ArrayBuffer)` ... just send plain socket data
- `runReplCommand(cmd: string)` ... run a Python command (should also lude multi-line "paste", note that original webrepl doesn't send ge clipboards)

webrepl protocol commands:
- `GET_VER()`
- `GET_FILE(filename: string)`
- `PUT_FILE(filename: string, targetFilename?: string)`

helper:
- `listFiles()`

### States

* [WebsocketState](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState):
  * `CONNECTING` (0)
  * `OPEN` (1)
  * `CLOSING` (2)
  * `CLOSED` (3)

* ReplState:
  * `CONNECTING`
  * `ASKING_FOR_PASSWORD`
  * `INVALID_PASSWORD`
  * `OPEN`
  * `CLOSED`

* ReplMode:
  * `TERMINAL` (raw io, default)
  * `WAITING_RESPONSE_COMMAND` (waiting for response after a REPL command was sent with `runReplCommand(cmd)`)
  * `WAITING_RESPONSE_GETVER`
  * `WAITING_RESPONSE_GETFILE_INIT`
  * `WAITING_RESPONSE_GETFILE_CONTENT`
  * `WAITING_RESPONSE_GETFILE_END`
  * `WAITING_RESPONSE_PUTFILE_INIT`
  * `WAITING_RESPONSE_PUTFILE_END`

### Events

* `REPL_CONNECTED`
* `REPL_CMD_RESPONSE`
* `REPL_SYSVER_RESPONSE`
* `REPL_GETFILE_RESPONSE`
* `REPL_TERMINAL_DATA`

References:

* https://github.com/micropython/webrepl
* Original JS implementation: https://github.com/micropython/webrepl/blob/master/webrepl.html

---

Usage:

```js
import { WebREPL, InvalidPassword } from 'micropython-webrepl'

try {
  const webrepl = new WebREPL()
  await webrepl.connect(host, password)
} catch (e) {
  // probably invalid password, but could also invalid host or another websocket error
  if (e instanceof InvalidPassword) {
    console.error('invalid password')
  } else {
    console.error(e)
  }
}
```
