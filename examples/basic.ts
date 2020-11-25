import { WebREPL } from '../src/main';

const HOST = '10.12.50.101';
// const HOST = 'localhost';
const PASSWORD = 'test';

(async () => {
  const webrepl = new WebREPL()

  // Connect to webrepl over network
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
})()
