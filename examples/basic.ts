import { WebREPL, WindowWithWebRepl, WebReplMode } from '../src/main'
import { InvalidPassword } from '../src/errors'
import WebSocket from 'ws'

const host = '10.12.50.101'
const password = 'test'

const run = async () => {
  try {
    const webrepl = new WebREPL()
    await webrepl.connect(host, password)
    console.log('after connect')
    const output = await webrepl.runReplCommand('import os; os.listdir()')
    console.log('after run command', output)
    await webrepl.close()
    console.log('after close')

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
