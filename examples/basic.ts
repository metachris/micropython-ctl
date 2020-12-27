import { MicroPythonDevice } from '../src/main';

const HOST = process.env.WEBREPL_HOST || '10.12.50.101';
const PASSWORD = process.env.WEBREPL_PASSWORD || 'test';

(async () => {
  const micropython = new MicroPythonDevice()

  // Connect to micropython device
  await micropython.connectNetwork(HOST, PASSWORD)
  // await micropython.connectSerial('/dev/ttyUSB0')

  // Run a Python script and capture the output
  const output = await micropython.runScript('import os; os.listdir()')
  console.log('runScript output:', output)

  // List all files in the root
  const files = await micropython.listFiles()
  console.log('files:', files)

  // Close
  await micropython.close()
})()
