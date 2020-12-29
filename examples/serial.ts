import readline from 'readline'
import { MicroPythonDevice } from '../src/main';

const micropython = new MicroPythonDevice()

// Keystroke capture for interactive REPL. Note: by default the keycapture
// keeps the program alive even when the socket has closed.
const setupKeyboardCapture = () => {
  // Shut down program on websocket close
  micropython.onclose = () => process.exit(0)

  // Show terminal output
  micropython.onTerminalData = (data) => process.stdout.write(data)

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
      console.log(await micropython.listFiles())
      return
    }

    // Send character to webrepl
    if (micropython.isConnected() && micropython.isTerminalMode()) {
      micropython.sendData(str)
    }
  });
}

(async () => {
  // const d = await serialport.list()
  // console.log(d)

  await micropython.connectSerial('/dev/tty.SLAB_USBtoUART')
  // await webrepl.connectNetwork('10.12.50.25', 'test')
  micropython.sendData('\x02')  // Ctrl+B: exit raw repl and show micropython header
  setupKeyboardCapture()

  const files = await micropython.listFiles()
  console.log(files)
})()
