import path from 'path';
import { Command } from 'commander';
import { ScriptExecutionError, WebREPL } from '../src/main';

const program = new Command();

const HOST = process.env.WEBREPL_HOST || '192.168.1.130';
const PASSWORD = process.env.WEBREPL_PASSWORD || 'test';

const micropython = new WebREPL()

const ensureConnectedDevice = async () => {
  try {
    if (!micropython.isConnected()) {
      if (program.tty) {
        console.log(`Connecting over serial to: ${program.tty}`)
        await micropython.connectSerial(program.tty)
      } else {
        console.log(`Connecting over network to: ${program.host}`)
        await micropython.connectNetwork(program.host, program.password)
      }
      // console.log('Connected')
    }
  } catch (e) {
    console.error('Could not connect:', e.toString())
    process.exit(1)
  }
}

const listFilesOnDevice = async (directory = '/') => {
  // console.log('listFilesOnDevice', directory)
  await ensureConnectedDevice()

  try {
    const files = await micropython.listFiles(directory)
    console.log(files)

  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      console.log(`ls: cannot access '${directory}': No such file or directory`)
      return
    }
    console.log('Error:', e)
  } finally {
    await micropython.close()
  }
}

const tree = async () => {
  // console.log('tree')
  await ensureConnectedDevice()
  const files = await micropython.listFiles('/')
  console.log(files)
  await micropython.close()
}

const putFile = async (filename: string, destFilename?: string) => {
  if (!destFilename) destFilename = path.basename(filename)
  console.log(filename, '->', destFilename)

  await ensureConnectedDevice()
  await micropython.uploadFile(filename, destFilename)
}

/**
 * Setup command line commands, using commander.js
 * https://github.com/tj/commander.js
 */
program.option('-t, --tty <device>', `Serial interface (eg. /dev/tty.SLAB_USBtoUART)`)
program.option('-h, --host <host>', `Hostname or IP of device`, HOST)
program.option('-p, --password <password>', `Password for network device`, PASSWORD)

// Commands
program.command('ls [directory]').description('List files').action(listFilesOnDevice);
program.command('tree').description('Print file tree').action(tree);

program
  .command('put <filename> [<destFilename>]')
  .description('Copy a file onto the device')
  .action(putFile);

// program.parse(process.argv)

(async () => {
  await program.parseAsync(process.argv);
})();
