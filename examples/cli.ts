/**
 * https://github.com/dhylands/rshell#commands
 *
 * TODO:
 * - cat
 * - get
 * - put
 * - edit
 * - mkdir
 * - repl
 * - rm
 * - rsync
 */
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

const listMicroPythonDevices = async () => {
  const devices = await SerialPort.list();
  return devices.filter(device => device.manufacturer || device.serialNumber)
}

const ensureConnectedDevice = async () => {
  try {
    if (!micropython.isConnected()) {
      if (program.host) {
        console.log(`Connecting over network to: ${program.host}`)
        await micropython.connectNetwork(program.host, program.password)
      } else {
        let device = program.tty

        // If not specified, detect devices and use first one
        if (!device || device === true) {
          const devices = await listMicroPythonDevices()
          if (devices.length === 0) {
            console.error('No serial devices foudn')
            process.exit(1)
          }
          device = devices[0].path
        }

        // Connect now
        console.log(`Connecting over serial to: ${device}`)
        await micropython.connectSerial(device)
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

const catFile = async (filename: string) => {
  await ensureConnectedDevice()
  const contents = await micropython.getFile(filename)
  console.log(contents)
  await micropython.disconnect()
}

const listSerialDevices = async () => {
  (await listMicroPythonDevices()).map(device => console.log(device.path, '\t', device.manufacturer))
}

/**
 * Setup command line commands, using commander.js
 * https://github.com/tj/commander.js
 */
program.option('-t, --tty [device]', `Serial interface (eg. /dev/tty.SLAB_USBtoUART)`)
program.option('-h, --host <host>', `Hostname or IP of device`)
program.option('-p, --password <password>', `Password for network device`, PASSWORD)

// Command: devices
program
  .command('devices')
  .description('List serial devices').action(listSerialDevices);

// Command: ls
program
  .command('ls [directory]')
  .option('-r, --recursive', 'List recursively')
  .description('List files on a device').action(listFilesOnDevice);

// Command: cat
program
  .command('cat <filename>')
  .description('Print content of a file on the device')
  .action(catFile);

// Command: put
program
  .command('put <filename> [<destFilename>]')
  .description('Copy a file onto the device')
  .action(putFile);

// program.parse(process.argv)

(async () => {
  await program.parseAsync(process.argv);
})();
