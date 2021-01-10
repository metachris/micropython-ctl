/**
 * This is a test script, to check all commands on a physical device
 */
import { MicroPythonDevice } from '../src/main';
import assert from 'assert'
// import { MicroPythonDevice } from 'micropython-ctl';

// const HOST = process.env.WEBREPL_HOST || '10.12.50.101';
// const PASSWORD = process.env.WEBREPL_PASSWORD || 'test';

(async () => {
  const micropython = new MicroPythonDevice();

  try {
    await micropython.connectSerial('/dev/tty.SLAB_USBtoUART')
    assert(micropython.isConnected())
    assert(micropython.isSerialDevice())
    assert(micropython.isTerminalMode())

    console.log('Running a Python script...')
    const output = await micropython.runScript('import os; print(os.listdir())')
    console.log('runScript output:', output)

    const files = await micropython.listFiles()
    console.log(files)

    console.log('\n✅ all checks completed')

    // TODO

  } catch (e) {
    console.error(e)
    process.exit(1)

  } finally {
    await micropython.disconnect()
  }
})()
