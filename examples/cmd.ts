import path from 'path';
import { Command } from 'commander';
import { ScriptExecutionError, WebREPL } from '../src/main';

const program = new Command();

const HOST = process.env.WEBREPL_HOST || '10.12.50.25'; // '10.12.50.101', '10.0.1.10'
const PASSWORD = process.env.WEBREPL_PASSWORD || 'test';

const webrepl = new WebREPL()
const ensureConnectedWebRepl = async () => {
  if (!webrepl.isConnected()) {
    console.log(`connecting to: ${HOST}`)
    await webrepl.connect(HOST, PASSWORD)
  }
  console.log('connected')
}

const listFilesOnDevice = async (directory = '/') => {
  console.log('listFilesOnDevice', directory)
  await ensureConnectedWebRepl()

  try {
    const files = await webrepl.listFiles(directory)
    console.log(files)

  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      console.log(`ls: cannot access '${directory}': No such file or directory`)
      return
    }
    console.log('Error:', e)
  } finally {
    await webrepl.close()
  }
}

const putFile = async (filename: string, destFilename?: string) => {
  if (!destFilename) destFilename = path.basename(filename)
  console.log(filename, '->', destFilename)

  await ensureConnectedWebRepl()
  await webrepl.uploadFile(filename, destFilename)
}


/**
 * Setup command line commands, using commander.js
 * https://github.com/tj/commander.js
 */
program.command('ls [directory]').description('List files').action(listFilesOnDevice);

program
  .command('put <filename> [<destFilename>]')
  .description('Copy a file onto the device')
  .action(putFile);

// program.parse(process.argv)

(async () => {
  await program.parseAsync(process.argv);
})();
