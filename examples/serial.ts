import readline from 'readline'
import serialport from "serialport"
import { WebReplMode, WebREPL, ScriptExecutionError } from '../src/main';

const webrepl = new WebREPL()

// Keystroke capture for interactive REPL. Note: by default the keycapture
// keeps the program alive even when the socket has closed.
const setupKeyboardCapture = () => {
  // Shut down program on websocket close
  webrepl.onclose = () => process.exit(0)

  // Show terminal output
  webrepl.onTerminalData = (data) => process.stdout.write(data)

  let specialMode = false
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', async (str, key) => {
    // console.log(str, key)

    // Enter special mode with ^]
    const wasSpecialMode = specialMode
    specialMode = key.ctrl && key.name === 'k'

    // Force quit with ^D in special mode
    if (wasSpecialMode && key.name === 'd') {
      process.exit(0)
    } else if (wasSpecialMode && key.name === 'l') {
      console.log(await webrepl.listFiles())
      return
    }

    // Send character to webrepl
    if (webrepl.isConnected() && webrepl.state.replMode === WebReplMode.TERMINAL) {
      webrepl.sendData(str)
    }
  });
}

(async () => {
  // const d = await serialport.list()
  // console.log(d)

  await webrepl.connectSerial('/dev/tty.SLAB_USBtoUART')
  // await webrepl.connectNetwork('10.12.50.25', 'test')
  webrepl.sendData('\x02')  // Ctrl+B: exit raw repl and show micropython header
  setupKeyboardCapture()

  try {
    // const files = await webrepl.runScript('test()')
    const files = await webrepl.listFiles()
    console.log(files)

    // const ver = await webrepl.getVer()
    // console.log('get ver:', ver)
  } catch (e) {
    console.log("err:", e.message)
  } finally {
    // process.exit(0)
  }
})()
