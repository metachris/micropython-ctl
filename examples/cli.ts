import path from 'path';
import SerialPort from 'serialport';
import { Command } from 'commander';
import { ScriptExecutionError, MicroPythonDevice } from '../src/main';
import { humanFileSize } from '../src/utils';

const program = new Command();

const HOST = process.env.WEBREPL_HOST || '192.168.1.188';
const PASSWORD = process.env.WEBREPL_PASSWORD || 'test';

const micropython = new MicroPythonDevice()

const CLR_RESET = "\x1b[0m";
const CLR_FG_BLUE = "\x1b[34m";

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

const listFilesOnDevice = async (directory = '/', cmdObj) => {
  // console.log('listFilesOnDevice', directory)
  await ensureConnectedDevice()

  try {
    const files = await micropython.listFiles(directory, cmdObj.recursive)
    files.map(file => console.log(`${humanFileSize(file.size).padStart(5)} ${file.isDir ? CLR_FG_BLUE : ''}${file.filename}${CLR_RESET}`))

  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      console.log(`ls: cannot access '${directory}': No such file or directory`)
      return
    }
    console.log('Error:', e)
  } finally {
    await micropython.disconnect()
  }
}

const putFile = async (filename: string, destFilename?: string) => {
  if (!destFilename) destFilename = path.basename(filename)
  console.log(filename, '->', destFilename)

  await ensureConnectedDevice()
  await micropython.uploadFile(filename, destFilename)
}

const listSerialDevices = async () => {
  const devices = await SerialPort.list();
  // console.log(devices)
  devices.map(device => {
    if (!device.manufacturer && !device.serialNumber) {
      return
    }
    console.log(device.path, '\t', device.manufacturer)
  })
}

/**
 * Setup command line commands, using commander.js
 * https://github.com/tj/commander.js
 */
program.option('-t, --tty <device>', `Serial interface (eg. /dev/tty.SLAB_USBtoUART)`)
program.option('-h, --host <host>', `Hostname or IP of device`, HOST)
program.option('-p, --password <password>', `Password for network device`, PASSWORD)

// Commands
program
  .command('devices')
  .description('List serial devices').action(listSerialDevices);

program
  .command('ls [directory]')
  .option('-r, --recursive', 'List recursively')
  .description('List files on a device').action(listFilesOnDevice);

program
  .command('put <filename> [<destFilename>]')
  .description('Copy a file onto the device')
  .action(putFile);

// program.parse(process.argv)

(async () => {
  await program.parseAsync(process.argv);
})();
