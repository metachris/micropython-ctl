#!/usr/bin/env node
/**
 * Command line interface for talking to MicroPython devices over serial or network (webrepl)
 *
 * Part of https://github.com/metachris/micropython-ctl
 *
 * Installed as `mctl`. Install with:
 *
 *     $ npm install -g micropython-ctl
 *
 * Usage:
 *
 *     $ mctl --help
 *     $ mctl devices
 *     $ mctl ls -r
 *     $ mctl repl
 *
 * Using https://github.com/tj/commander.js
 *
 * See also:
 * - https://github.com/dhylands/rshell#commands
 * - https://github.com/scientifichackers/ampy/blob/master/ampy/files.py
 *
 * In progress:
 * - get
 *
 * TODO:
 * - run (script or Python file)
 * - edit
 * - rsync?
 */
import * as path from 'path';
import fs from 'fs';
import readline from 'readline'
import { Buffer } from 'buffer/'
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
const CLR_FG_RED = "\x1b[31m";

const logError = (...msg: any) => {
  process.stderr.write(CLR_FG_RED)
  console.error(...msg, CLR_RESET)
}

const logVerbose = (...msg: any) => {
  if (!program.silent) {
    console.log(...msg)
  }
}

const listMicroPythonDevices = async () => {
  const devices = await SerialPort.list();
  return devices.filter(device => device.manufacturer || device.serialNumber)
}

const ensureConnectedDevice = async () => {
  try {
    if (!micropython.isConnected()) {
      if (program.host) {
        logVerbose(`Connecting over network to: ${program.host}`)
        await micropython.connectNetwork(program.host, program.password)
      } else {
        let device = program.tty

        // If not specified, detect devices and use first one
        if (!device || device === true) {
          const devices = await listMicroPythonDevices()
          if (devices.length === 0) {
            console.error('No serial device found')
            process.exit(1)
          }
          device = devices[0].path
        }

        // Connect now
        logVerbose(`Connecting over serial to: ${device}`)
        await micropython.connectSerial(device)
      }
      // console.log('Connected')
    }
  } catch (e) {
    logError('Could not connect:', e.toString())
    process.exit(1)
  }
}

const listFilesOnDevice = async (directory = '/', cmdObj) => {
  // console.log('listFilesOnDevice', directory)
  await ensureConnectedDevice()

  try {
    const files = await micropython.listFiles({ directory, recursive: cmdObj.recursive })
    files.map(file => console.log(`${humanFileSize(file.size).padStart(5)} ${file.isDir ? CLR_FG_BLUE : ''}${file.filename}${CLR_RESET}`))

  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      logError(`ls: cannot access '${directory}': No such file or directory`)
      return
    }
    console.log('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

const putFile = async (filename: string, destFilename?: string) => {
  if (!destFilename) destFilename = path.basename(filename)
  console.log(filename, '->', destFilename)

  const data = Buffer.from(fs.readFileSync(filename))

  try {
    await ensureConnectedDevice()
    await micropython.putFile(destFilename, data)
  } finally {
    await micropython.disconnect()
  }
}

const mkdir = async (name: string) => {
  console.log('mkdir', name)

  await ensureConnectedDevice()

  try {
    await micropython.mkdir(name)
  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 17] EEXIST')) {
      console.log(`${CLR_FG_RED}mkdir: cannot create directory '${name}': File exists${CLR_RESET}`)
    }
    console.log('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

const catFile = async (filename: string) => {
  try {
    await ensureConnectedDevice()
    const contents = await micropython.getFile(filename)
    console.log(contents.toString())
  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      logError(`cat: cannot access '${filename}': No such file or directory`)
      return
    }
    logError('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

const get = async (filenameOrDir: string, targetFilenameOrDir: string) => {
  // console.log('get', filenameOrDir, targetFilenameOrDir)
  try {
    await ensureConnectedDevice()
    const statResult = await micropython.statPath(filenameOrDir)
    if (!statResult.isDir) {
      // get a file
      let targetFilename = filenameOrDir.replace(/^.*[\\\/]/, '')
      if (targetFilenameOrDir) {
        targetFilename = targetFilenameOrDir.endsWith('/') ? targetFilenameOrDir + targetFilename : targetFilenameOrDir
      }
      console.log(`get: ${filenameOrDir} -> ${targetFilename}`)
      const contents = await micropython.getFile(filenameOrDir)
      fs.writeFileSync(targetFilename, contents)
    } else {
      logError('get: download of directory not yet implemented')
      return
    }

  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      console.log(`${CLR_FG_RED}get: cannot access '${filenameOrDir}': No such file or directory${CLR_RESET}`)
      return
    }
    console.log('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}


const rm = async (path: string, cmdObj) => {
  console.log('rm', path)

  try {
    await ensureConnectedDevice()
    await micropython.rm(path, cmdObj.recursive)
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

// mctl devices
const listSerialDevices = async () => {
  (await listMicroPythonDevices()).map(device => console.log(device.path, '\t', device.manufacturer))
}

const repl = async () => {
  try {
    await ensureConnectedDevice()

    micropython.onclose = () => process.exit(0)
    micropython.onTerminalData = (data) => process.stdout.write(data)

    // Setup keyboard capture
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', async (str, key) => {
      // Quit on Ctrl+K
      if (key.name === 'k' && key.ctrl) process.exit(0)

      // Send anything to the device, if connected
      if (micropython.isConnected() && micropython.isTerminalMode()) {
        micropython.sendData(str)
      }
    });

    console.log('Exit REPL by pressing Ctrl+K')

    // Send Ctrl+B (exit raw repl and show micropython header)
    micropython.sendData('\x02')
  } catch (e) {
    console.log('Error:', e)
    await micropython.disconnect()
  }
}

/**
 * Setup command line commands, using commander.js
 * https://github.com/tj/commander.js
 */
program.option('-t, --tty [device]', `Connect over serial interface (eg. /dev/tty.SLAB_USBtoUART)`)
program.option('-h, --host <host>', `Connect over network to hostname or IP of device`)
program.option('-p, --password <password>', `Password for network device`, PASSWORD)
program.option('-s, --silent', `Hide unnecessary output`)

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

// Command: get
program
  .command('get <file_or_dirname> [out_file_or_dirname]')
  // .option('-r, --recursive', 'List recursively')
  .description('Download a file or directory from the device')
  .action(get);

// Command: put
program
  .command('put <filename> [<destFilename>]')
  .description('Copy a file onto the device')
  .action(putFile);

// Command: mkdir
program
  .command('mkdir <name>')
  .description('Create a directory')
  .action(mkdir);

// Command: rm [-r]
program
  .command('rm <path>')
  .option('-r, --recursive', 'Delete recursively')
  .description('Delete a file or directory')
  .action(rm);

// Command: repl
program
  .command('repl')
  .description('Open a REPL terminal')
  .action(repl);

// Command: version
program
  .command('version')
  .description('Print the version of mctl')
  .action(() => {
    const pjson = require('../package.json');
    console.log(`v${pjson.version}`);
  });

(async () => {
  await program.parseAsync(process.argv);
})();
