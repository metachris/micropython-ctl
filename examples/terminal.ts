/**
 * REPL terminal. Quit by pressing Ctrl+K
 */
import readline from 'readline'
import { MicroPythonDevice } from '../src/main'

const HOST = '10.0.1.10'
const PASSWORD = 'test'

const micropython = new MicroPythonDevice()

// Shut down program on websocket close
micropython.onclose = () => process.exit(0)
micropython.onTerminalData = (data) => process.stdout.write(data)

// Keystroke capture for interactive REPL
const setupKeyboardCapture = () => {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', async (str, key) => {
    // console.log(str, key)

    // Quit on Ctrl+K
    if (key.name === 'k' && key.ctrl) process.exit(0)

    // Send anything to the device, if connected
    if (micropython.isConnected() && micropython.isTerminalMode()) {
      micropython.sendData(str)
    }
  });
}

// Connect to device
(async () => {
  setupKeyboardCapture()

  // Connect over network or serial
  // await micropython.connectNetwork(HOST, PASSWORD)
  await micropython.connectSerial('/dev/tty.SLAB_USBtoUART')

  // Send Ctrl+B (exit raw repl and show micropython header)
  micropython.sendData('\x02')
})()
