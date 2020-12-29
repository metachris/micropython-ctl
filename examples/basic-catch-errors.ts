import { MicroPythonDevice, InvalidPassword, CouldNotConnect } from '../src/main'
// import { MicroPythonDevice, InvalidPassword, CouldNotConnect } from 'micropython-ctl'

const HOST = '10.12.50.101';
// const HOST = 'localhost';
const PASSWORD = 'test';

(async () => {
  const micropython = new MicroPythonDevice()

  try {
    // First we connect
    await micropython.connectNetwork(HOST, PASSWORD)
    console.log('after connect')

    // Run a REPL command and capture the output
    const output = await micropython.runScript('import os; print(os.listdir())')
    console.log('after run command', output)

    // List all files (as a list of filenames)
    const files = await micropython.listFiles()
    console.log('files:', files)

    // Close
    await micropython.close()
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
