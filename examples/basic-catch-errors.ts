import { WebREPL, InvalidPassword, CouldNotConnect } from '../src/main'

const HOST = '10.12.50.101';
// const HOST = 'localhost';
const PASSWORD = 'test';

(async () => {
  const webrepl = new WebREPL()

  try {
    // First we connect
    await webrepl.connect(HOST, PASSWORD)
    console.log('after connect')

    // Run a REPL command and capture the output
    const output = await webrepl.runReplCommand('import os; os.listdir()')
    console.log('after run command', output)

    // List all files (as a list of filenames)
    const files = await webrepl.listFiles()
    console.log('files:', files)

    // Close
    await webrepl.close()
    console.log('after close')

  } catch (e) {
    // probably invalid password, but could also invalid host or another websocket error
    if (e instanceof InvalidPassword) {
      console.error('Invalid password')

    } else if (e instanceof CouldNotConnect) {
      // A websocket connection problem: already a webrepl connection, ECONNREFUSED, etc
      console.error('Could not connect:', e.message)

    } else {
      console.error(e)
    }
  }
})()
