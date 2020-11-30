/**
 * Simple interactive REPL terminal.
 *
 * You can force-quit with Ctrl+] followed by Ctrl+D (like SSH)
 */
import readline from 'readline'
import { WebREPL, WebReplMode } from '../src/main'

const HOST = process.env.WEBREPL_HOST || '10.12.50.25'; // '10.12.50.101', '10.0.1.10'
const PASSWORD = process.env.WEBREPL_PASSWORD || 'test';

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
    specialMode = key.sequence === '\u001d'

    // Force quit with ^D in special mode
    if (wasSpecialMode && key.sequence === '\u0004' && key.ctrl) {
      process.exit(0)
    }

    // Send character to webrepl
    if (webrepl.isConnected() && webrepl.state.replMode === WebReplMode.TERMINAL) {
      webrepl.wsSendData(str)
    }
  });
}

// Main program: setup keycapture & connect to webrepl
(async () => {
  try {
    await webrepl.connect(HOST, PASSWORD)
    webrepl.wsSendData('\x02')  // Ctrl+B: exit raw repl and show micropython header

    // Only after connecting we start keyboard capture
    setupKeyboardCapture()
  } catch (e) {
    console.error(e)
  }
})()
