import { MicroPythonDevice } from '../src/main';

const HOST = process.env.WEBREPL_HOST || '10.12.50.101';
const PASSWORD = process.env.WEBREPL_PASSWORD || 'test';

(async () => {
  const micropython = new MicroPythonDevice()

  // Connect to micropython device
  await micropython.connectNetwork(HOST, PASSWORD)
  // await micropython.connectSerial('/dev/ttyUSB0')

  // Run a Python script and capture the output
  console.log('Running a Python script...')
  const output = await micropython.runScript('import os; print(os.listdir())')
  console.log('runScript output:', output)

  // List all files in the root
  console.log('Listing files...')
  const files = await micropython.listFiles()
  console.log('files:', files)

  // Close
  await micropython.close()
})()
