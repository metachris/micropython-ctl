import { WebREPL, WindowWithWebRepl, WebReplMode } from '../src/main'
import { InvalidPassword } from '../src/errors'

import readline from 'readline'

const HOST = '10.12.50.101'
const PASSWORD = 'test'

const webrepl = new WebREPL()

// Shut down program on websocket close
webrepl.onclose = () => process.exit(0)

// Keystroke capture for interactive REPL
let specialMode = false
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', async (str, key) => {
  // console.log(str, key)

  // Enter special mode with ^] (force quit with ^] and ^D)
  const wasSpecialMode = specialMode
  specialMode = key.sequence === '\u001d'

  if (wasSpecialMode) {
    if (key.sequence === '\u0004' && key.ctrl) {
      process.exit(0)

    } else if (key.sequence === 'w') {
      console.log(webrepl.state.ws)

    } else if (key.sequence === 'l') {
      const cmd = 'import os; os.listdir()'
      console.log(cmd)
      const output = await webrepl.runReplCommand(cmd)
      console.log(output)
    }

    return
  }

  // Send key to webrepl
  if (webrepl.state.replMode === WebReplMode.TERMINAL) {
    webrepl.wsSendData(str)
  }
})

// Connect to webrepl and do stuff
const run = async () => {
  try {
    await webrepl.connect(HOST, PASSWORD)
    console.log('WebREPL connected')
    webrepl.wsSendData('\r')

  } catch (e) {
    // probably invalid password, but could also invalid host or another websocket error
    if (e instanceof InvalidPassword) {
      console.error('Error: Invalid password')
    } else {
      console.error(e)
    }
  }
}

run()
