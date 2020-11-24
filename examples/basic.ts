import { WebREPL, InvalidPassword } from '../src/main'

const HOST = '10.12.50.101'
const PASSWORD = 'test'

const webrepl = new WebREPL()

// Connect to webrepl and do stuff
const run = async () => {
  try {
    await webrepl.connect(HOST, PASSWORD)
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
