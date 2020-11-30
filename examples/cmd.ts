import path from 'path';
import { Command } from 'commander';
import { WebREPL } from '../src/main';

const program = new Command();

const HOST = process.env.WEBREPL_HOST || '10.12.50.26'; // '10.12.50.101', '10.0.1.10'
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
  const files = await webrepl.listFiles('/', true)
  console.log(files)
}

const putFile = async (filename: string, destFilename?: string) => {
  if (!destFilename) {
    destFilename = path.basename(filename)
  }
  console.log(filename, '->', destFilename)

  await ensureConnectedWebRepl()
  await webrepl.uploadFile(filename, destFilename)
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
