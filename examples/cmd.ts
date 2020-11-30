import path from 'path';
import { Command } from 'commander';
import { WebREPL } from '../src/main';
import { ls, lsSimple } from './python-scripts/scripts';
// import { ls } from './test-scripts';
const program = new Command();

const HOST = process.env.WEBREPL_HOST || '10.12.50.25'; // '10.12.50.101', '10.0.1.10'
const PASSWORD = process.env.WEBREPL_PASSWORD || 'test';

const webrepl = new WebREPL()
const ensureConnectedWebRepl = async () => {
  if (!webrepl.isConnected()) {
    console.log(`connecting to: ${HOST}`)
    await webrepl.connect(HOST, PASSWORD)
  }
}

const listFilesOnDevice = async () => {
  await ensureConnectedWebRepl()
  // const output = await webrepl.runScript(lsSimple)
  const script = ls()
  console.log(script)
  const output = await webrepl.runScript(script)
  console.log(output)
}

const putFile = async (filename: string, destFilename?: string) => {
  if (!destFilename) {
    destFilename = path.basename(filename)
  }
  console.log(filename, '->', destFilename)
}


program.command('ls').description('List files').action(listFilesOnDevice);
program
  .command('put <filename> [<destFilename>]')
  .description('Copy a file onto the device')
  .action(putFile);

(async () => {
  try {
    await program.parseAsync(process.argv);

  } catch (e) {
    console.error(e.message)

  } finally {
    webrepl.close()
  }
})();
