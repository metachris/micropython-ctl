import readline from 'readline'
import { MicroPythonDevice, WebReplMode } from '../src/main'

// const HOST = '10.12.50.101'
const HOST = '10.0.1.10'
const PASSWORD = 'test'

const webrepl = new MicroPythonDevice()

// Shut down program on websocket close
webrepl.onclose = () => process.exit(0)
webrepl.onTerminalData = (data) => process.stdout.write(data)

// Keystroke capture for interactive REPL
const setupKeyboardCapture = () => {
  let specialMode = false
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', async (str, key) => {
    // console.log(str, key)

    // Enter special mode with ^] (force quit with ^] and ^D)
    const wasSpecialMode = specialMode
    specialMode = key.sequence === '\u001d'
    if (wasSpecialMode && key.sequence === '\u0004' && key.ctrl) {
      process.exit(0)
    }

    if (!webrepl.isConnected()) return

    if (wasSpecialMode) {
      if (key.sequence === 'w') {
        console.log(webrepl.state.ws)

      } else if (key.sequence === 'l') {
        const files = await webrepl.listFiles()
        console.log(`\nfiles:`, files)

      } else if (key.sequence === 'p') {
        const cmd = 'import os; os.listdir()'
        webrepl.wsSendData(cmd + '\r')
      }

      return
    }

    // Send key to webrepl
    if (webrepl.state.replMode === WebReplMode.TERMINAL) {
      webrepl.wsSendData(str)
    }
  });
}

// Connect to webrepl and do stuff
(async () => {
  setupKeyboardCapture()
  await webrepl.connectNetwork(HOST, PASSWORD)
  webrepl.wsSendData('\x02')  // Ctrl+B: exit raw repl and show micropython header
})()
