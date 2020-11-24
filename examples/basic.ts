import { WebREPL, WindowWithWebRepl, WebReplMode } from '../src/main'
import { InvalidPassword } from '../src/errors'

import readline from 'readline'

let lastKey = null
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (str, key) => {
  console.log(str)
  console.log(key)

  if (key.sequence === '\u0004' && key.ctrl) {
    console.log('x')
    if (lastKey.sequence === '\u001d') {
      process.exit(1)
    }
  }
})

// import tty from 'tty'
// //require('tty').setRawMode(true);
// tty.

const host = '10.12.50.101'
const password = 'test'

const run = async () => {
  try {
    const webrepl = new WebREPL()
    await webrepl.connect(host, password)
    console.log('after connect')
    // const output = await webrepl.runReplCommand('import os; os.listdir()')
    // console.log('after run command', output)

    // for await (const line of rl) {
    //   console.log(line)
    // }

    // await webrepl.close()
    // console.log('after close')

  } catch (e) {
    // probably invalid password, but could also invalid host or another websocket error
    if (e instanceof InvalidPassword) {
      console.error('invalid password')
    } else {
      console.error(e)
    }
  }
}

run()
