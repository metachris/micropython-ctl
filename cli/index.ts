#!/usr/bin/env node
/**
 * Command line interface for talking to MicroPython devices over serial or network (webrepl)
 *
 * https://github.com/metachris/micropython-ctl/tree/master/cli
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
 *     $ mctl mount
 *
 * Supports env vars:
 * - serial connection: MCTL_TTY, AMPY_PORT
 * - network connection: MCTL_HOST, WEBREPL_HOST
 *
 * Issues & TODO: https://github.com/metachris/micropython-ctl/issues/3
 */
import * as path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';
import readline from 'readline'
import { Buffer } from 'buffer/'
import { SerialPort } from 'serialport';
import { Command } from 'commander';
import { ScriptExecutionError, MicroPythonDevice, WEBSERVER_PORT, FileListEntry } from '../src/main';
import { humanFileSize } from './utils';
import { getTmpFilename, globToRegExp } from '../src/utils-node';
import { mount as mountWithFuse } from './mount-device'
import { checkAndInstall as checkAndInstallFuse } from './fuse-dependencies'
import { run as runInternalTests } from '../tests/testsuite'

// tslint:disable-next-line: no-var-requires
const pjson = require('../package.json');

// https://github.com/tj/commander.js
const program = new Command();

// https://metachris.github.io/micropython-ctl/classes/micropythondevice.html
const micropython = new MicroPythonDevice()

process.on('unhandledRejection', error => {
  console.log(error)
  console.log('Please open an issue at https://github.com/metachris/micropython-ctl/issues')
  process.exit(2)
})

const CLR_RESET = "\x1b[0m";
const CLR_FG_BLUE = "\x1b[34m";
const CLR_FG_RED = "\x1b[31m";
const CLR_FG_YELLOW = "\x1b[33m";

const logError = (...msg: any) => {
  process.stderr.write(CLR_FG_RED)
  console.error(...msg, CLR_RESET)
}

const logVerbose = (...msg: any) => {
  if (!program.opts().silent) {
    console.log(...msg)
  }
}

const listSerialDevices = async () => {
  const devices = await SerialPort.list();

  // Apply some filters
  return devices.filter(device => device.manufacturer || device.serialNumber || device.vendorId)
}

interface EnsureConnectedDeviceOptions {
  startWebserver?: boolean
  // canUseProxy?: boolean
}

/**
 * Auto-connect priorities:
 * 1. --host or --tty option
 * 2. MCTL_TTY or AMPY_PORT -> serial connection
 * 3. MCTL_HOST or WEBREPL_HOST -> network connection
 */
const ensureConnectedDevice = async (options?: EnsureConnectedDeviceOptions) => {
  const opts = program.opts()
  const tty = opts.tty as string
  const host = opts.host
  const password = opts.password
  const envWebreplHost = process.env.WEBREPL_HOST
  const envMctlHost = process.env.MCTL_HOST
  const envMctlTty = process.env.MCTL_TTY
  const envAmpyPort = process.env.AMPY_PORT

  // Disable info output when --json in arguments
  const doPrint = program.args.indexOf("--json") === -1

  // Connect via network if host is defined, or if no tty specified then check env vars
  const shouldConnectToSerial = (): boolean => {
    if (tty) return true
    if (host) return false
    if (envMctlTty) return true
    if (envMctlHost) return false
    if (envWebreplHost) return false
    return true
  }

  try {
    // Do nothign if already connected
    if (micropython.isConnected()) return

    if (shouldConnectToSerial()) {
      const getSerialDevice = async (): Promise<string> => {
        if (tty) {
          if (tty.startsWith('/')) return tty
          if (fs.existsSync('/dev/')) {
            const ttyInDev = fs.readdirSync('/dev/').filter(e => e.startsWith('tty') && e.endsWith(tty))
            if (ttyInDev.length) return '/dev/' + ttyInDev[0]
          }
          return tty  // -t / --tty option
        }
        if (envMctlTty) return envMctlTty  // MCTL_TTY env var
        if (envAmpyPort) return envAmpyPort  // AMPY_PORT env var
        const devices = await listSerialDevices()  // Auto-detect devices and use first one
        if (devices.length === 0) throw new Error('No serial device found')
        return devices[0].path
      }

      const device = await getSerialDevice()
      if (doPrint) logVerbose(`Connecting over serial to: ${device}`)
      await micropython.connectSerial(device)

    } else {
      const _host = host || envMctlHost || envWebreplHost
      const _pass = password || process.env.MCTL_PASSWORD || process.env.WEBREPL_PASSWORD
      if (doPrint) logVerbose(`Connecting over network to: ${_host}`)
      if (!_pass) throw new Error('No webrepl password supplied')
      await micropython.connectNetwork(_host, _pass)
    }

    // Start proxy webserver
    if (options?.startWebserver) micropython.startInternalWebserver()

    if (micropython.isProxyConnection()) {
      logVerbose(`Reusing an existing instance via http://localhost:${WEBSERVER_PORT}/api/`)
    }
  } catch (e) {
    logError('Could not connect:', e.toString())
    process.exit(1)
  }
}

// mctl devices
const cmdListDevices = async () => {
  (await listSerialDevices()).map(device => console.log(device.path, '\t', device.manufacturer))
}

// mctl ls [-r]
const listFilesOnDevice = async (directory = '/', cmdObj) => {
  // console.log('listFilesOnDevice', directory, cmdObj)
  await ensureConnectedDevice()

  try {
    const files = await micropython.listFiles(directory, { recursive: cmdObj.recursive, includeSha256: !!cmdObj.includeHash })
    if (cmdObj.json || cmdObj.includeHash) {
      // Output in JSON
      const s = JSON.stringify(files, null, 4)
      console.log(s)
    } else {
      // Output for humans
      files.map(file => console.log(`${humanFileSize(file.size).padStart(5)} ${file.isDir ? CLR_FG_BLUE : ''}${file.filename}${CLR_RESET}`))
    }

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

/**
 * Upload a file
 *
 * filenames when copying from local -> device:
 * - boot.py     -> boot.py
 * - test/foo.py -> foo.py
 * - test/       -> test/foo.py
 *
 * @param filename filename, glob or directory name
 * @param dest filename or path
 */
const put = async (filename: string, dest?: string, cmdObj?: any) => {
  // logVerbose('put', filename, '->', dest)
  const { changedOnly } = cmdObj

  // helper to perform individual upload
  const uploadSingleFile = async (_filename: string, _dest = dest) => {
    let target = path.basename(_filename)
    if (_dest) {
      target = _dest.endsWith('/') ? _dest + target : _dest
    }
    console.log('put:', _filename, '->', target)
    const data = Buffer.from(fs.readFileSync(_filename))
    await micropython.putFile(target, data, { checkIfSimilarBeforeUpload: changedOnly })
  }

  const uploadDirectory = async (_dirname: string) => {
    if (_dirname.endsWith('/')) _dirname = _dirname.substr(0, _dirname.length - 1)
    // console.log('uploadDir', _dirname)

    // create dir on device, if not exists
    const deviceStat = await micropython.statPath(_dirname)
    if (!deviceStat.exists) {
      await micropython.mkdir(_dirname)
    }

    // Iterate over all files and directories, and upload
    for (const _filename of fs.readdirSync(_dirname)) {
      const fn = path.join(_dirname, _filename)
      const stat = fs.statSync(fn)

      if (stat.isFile()) {
        await uploadSingleFile(fn, _dirname === '.' ? '/' : _dirname + '/')
      } else if (stat.isDirectory()) {
        await uploadDirectory(fn)
      }
    }
  }

  // Connect and upload
  try {
    await ensureConnectedDevice()

    // Is argument glob?
    if (filename.indexOf('*') > -1) {
      const filesDir = path.dirname(filename)
      const filesRegex = globToRegExp(path.basename(filename))
      const files = fs.readdirSync(filesDir).filter(dir => filesRegex.test(dir))
      for (const _filename of files) {
        await uploadSingleFile(_filename)
      }
      return
    }

    // Else file or directory
    const stat = fs.statSync(filename)
    if (stat.isFile()) {
      await uploadSingleFile(filename)
    } else if (stat.isDirectory()) {
      await uploadDirectory(filename)
    }
  } finally {
    await micropython.disconnect()
  }
}

const mkdir = async (name: string) => {
  // logVerbose('mkdir', name)

  await ensureConnectedDevice()

  try {
    await micropython.mkdir(name)
  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 17] EEXIST')) {
      logError(`mkdir: cannot create directory '${name}': File exists`)
      return
    }
    console.log('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

const boardInfo = async (cmdObj) => {
  try {
    await ensureConnectedDevice()
    const info = await micropython.getBoardInfo()
    if (cmdObj.json) {
      const s = JSON.stringify(info, null, 4)
      console.log(s)
    } else {
      console.log(info)
    }
  } finally {
    await micropython.disconnect()
  }
}

const catFile = async (filename: string) => {
  try {
    await ensureConnectedDevice()
    if (!filename.startsWith('/')) filename = '/' + filename
    const contents = await micropython.getFile(filename)
    console.log(contents.toString())
  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      logError(`cat: cannot access '${filename}': No such file or directory`)
      return
    } else if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 21] EISDIR')) {
      logError(`cat: cannot read '${filename}' beacuse it is a directory`)
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

    // . is an alias for: `get -r .` is `get -r /`
    if (filenameOrDir === '.') filenameOrDir = '/'

    // handle glob pattern (eg. '*.py')
    if (filenameOrDir.startsWith('*.') || filenameOrDir.endsWith('*')) {
      // TODO
      console.log('patterns not yet implemented')
      return
    }

    // filename must have trailing slash
    if (!filenameOrDir.startsWith('/')) filenameOrDir = '/' + filenameOrDir

    // check if path exists
    const statResult = await micropython.statPath(filenameOrDir)
    if (!statResult.exists) {
      logError(`get: cannot access '${filenameOrDir}': No such file or directory`)
      return
    }

    if (statResult.isDir) {
      if (!targetFilenameOrDir) {
        targetFilenameOrDir = '.'
      }

      // remove possible trailing slash
      if (targetFilenameOrDir.endsWith('/')) targetFilenameOrDir = targetFilenameOrDir.substr(0, targetFilenameOrDir.length - 1)

      // make sure target directory exists
      if (!fs.existsSync(targetFilenameOrDir)) {
        // console.log('- mkdir', targetFilenameOrDir)
        fs.mkdirSync(targetFilenameOrDir)
      }

      const downloadDirectory = async (downloadDir: string) => {
        // console.log('downloadDir',  downloadDir)

        const fullTargetDir = path.join(targetFilenameOrDir, downloadDir)
        if (!fs.existsSync(fullTargetDir)) {
          // console.log('- mkdir', targetFilenameOrDir + downloadDir)
          fs.mkdirSync(fullTargetDir)
        }

        // copy everything recursively!
        const filesAndDirectories = await micropython.listFiles(downloadDir, { recursive: true })
        // console.log(filesAndDirectories)

        for (const item of filesAndDirectories) {
          const targetFileName = path.join(targetFilenameOrDir, item.filename)
          if (item.filename === downloadDir) continue  // don't re-download self
          if (item.isDir) {
            if (!fs.existsSync(targetFileName)) {
              // console.log('- mkdir', targetFileName)
              fs.mkdirSync(targetFileName)
            }
          } else {
            console.log('get:', item.filename, '->', targetFileName)
            const contents = await micropython.getFile(item.filename)
            fs.writeFileSync(targetFileName, contents)
          }
        }
      }

      await downloadDirectory(filenameOrDir)

    } else {
      // It is a file.
      // TODO: handle glob, like in `putFile`

      // Define the target filename
      let targetFilename = path.basename(filenameOrDir) // removed the directory

      // If explicit target is supplied, it can be a directory or a filename
      if (targetFilenameOrDir) {
        targetFilename = targetFilenameOrDir.endsWith('/') ? targetFilenameOrDir + targetFilename : targetFilenameOrDir
      }

      console.log(`get: ${filenameOrDir} -> ${targetFilename}`)
      const contents = await micropython.getFile(filenameOrDir)
      fs.writeFileSync(targetFilename, contents)
    }

  } catch (e) {
    console.log('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}


const rm = async (targetPath: string, cmdObj) => {
  if (!targetPath.startsWith('/')) targetPath = '/' + targetPath
  // logVerbose('rm', targetPath)

  try {
    await ensureConnectedDevice()
    await micropython.remove(targetPath, cmdObj.recursive)
  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: 39')) {
      logError(`rm: cannot remove '${targetPath}': Is a directory. (use -r to delete recursively)`)
      return
    } else if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      logError(`rm: cannot remove '${targetPath}': No such file or directory`)
      return
    }
    console.error('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

const mv = async (oldPath: string, newPath: string) => {
  // logVerbose('mv', oldPath, newPath)

  try {
    await ensureConnectedDevice()
    await micropython.rename(oldPath, newPath)
  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      logError(`mv: cannot rename '${oldPath}': No such file or directory`)
      return
    }
    console.error('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

const run = async (fileOrCommand: string) => {
  // logVerbose('run', fileOrCommand)
  const script = fs.existsSync(fileOrCommand) ? fs.readFileSync(fileOrCommand).toString() : fileOrCommand
  // logVerbose(script)

  try {
    await ensureConnectedDevice()
    const output = await micropython.runScript(script)
    console.log(output)
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

const edit = async (filename: string) => {
  // logVerbose('edit', filename)
  const baseFilename = filename.replace(/^.*[\\\/]/, '')
  const tmpFilename = getTmpFilename(baseFilename)

  try {
    await ensureConnectedDevice()
    const output = await micropython.getFile(filename)
    const hashBefore = crypto.createHash('sha256').update(output).digest('hex')

    // write to temp file and edit
    fs.writeFileSync(tmpFilename, output)
    const editorCmd = process.env.EDITOR || 'vim'
    execSync(`${editorCmd} ${tmpFilename}`, { stdio: 'inherit' })

    // read and compare
    const outputAfter = fs.readFileSync(tmpFilename)
    const hashAfter = crypto.createHash('sha256').update(outputAfter).digest('hex')

    // perhaps upload
    if (hashAfter !== hashBefore) {
      console.log(`File contents changed, uploading ${filename}...`)
      await micropython.putFile(filename, Buffer.from(outputAfter))
    }

  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      logError(`cat: cannot access '${filename}': No such file or directory`)
      return
    } else if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 21] EISDIR')) {
      logError(`cat: cannot read '${filename}' beacuse it is a directory`)
      return
    }
    console.error('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

const reset = async (cmdObj) => {
  // logVerbose('reset')

  await ensureConnectedDevice()
  await micropython.reset({ softReset: !!cmdObj.soft })  // cannot await result because it's restarting and we loose the connection
  process.exit(0)
}

const sync = async (directory = './') => {
  // console.log('sync', directory)
  try {
    await ensureConnectedDevice()
    console.log('Getting file list from device...')
    await micropython.gcCollect()
    const filesOnDevice = await micropython.listFiles('/', { recursive: true, includeSha256: true })
    const filesOnDeviceByFilename: { [fn: string]: FileListEntry } = {}
    for (const entry of filesOnDevice.reverse()) {
      if (entry.filename === '/') continue
      filesOnDeviceByFilename[entry.filename] = entry
    }

    // console.log(filesOnDeviceByFilename)

    // console.log('Building local file list...')
    interface FileEntry {
      filename: string
      isDir: boolean
      sha256: string | null
    }
    const getFilesInDir = (_dirname) => {
      const ret: FileEntry[] = []

      for (const _filename of fs.readdirSync(_dirname)) {
        const fn = path.join(_dirname, _filename)
        const stat = fs.statSync(fn)

        if (stat.isFile()) {
          const fileContent = fs.readFileSync(fn)
          const localHash = crypto.createHash('sha256').update(fileContent).digest('hex')
          ret.push({ filename: fn, isDir: false, sha256: localHash })
        } else if (stat.isDirectory()) {
          ret.push({ filename: fn, isDir: true, sha256: null })
          const subFiles = getFilesInDir(fn)
          ret.push(...subFiles)
        }
      }

      return ret
    }
    const filesLocal = getFilesInDir(directory)
    // console.log(filesLocal)
    const filesLocalHashes = {}
    for (const entry of filesLocal) {
      filesLocalHashes[entry.filename] = entry
    }

    // console.log("Computing actions...")
    // Find files to delete (exist on device but not local)
    for (const fn in filesOnDeviceByFilename) {
      if (Object.prototype.hasOwnProperty.call(filesOnDeviceByFilename, fn)) {
        const fullFn = path.join(directory, fn)
        if (!filesLocalHashes[fullFn]) {
          console.log(`delete ${fn} because not existing locally`)
          await micropython.remove(fn)
        }
      }
    }

    // Find files to upload or update
    for (const entry of filesLocal) {
      let targetFn = directory === './' ? entry.filename : entry.filename.substr(directory.length)  // remove local path prefix
      if (!targetFn.startsWith('/')) targetFn = '/' + targetFn
      // console.log(entry, targetFn)

      if (filesOnDeviceByFilename[targetFn]) {
        if (entry.isDir && filesOnDeviceByFilename[targetFn].isDir) continue
        const hashOnDevice = filesOnDeviceByFilename[targetFn].sha256
        if (hashOnDevice !== entry.sha256) {
          console.log(`upload ${targetFn}`)
          await micropython.remove(targetFn)
          const data = Buffer.from(fs.readFileSync(entry.filename))
          await micropython.putFile(targetFn, data)
        }
      } else {
        if (entry.isDir) {
          console.log(`create directory ${targetFn}`)
          await micropython.mkdir(targetFn)
        } else {
          console.log(`upload ${entry.filename} -> ${targetFn}`)
          const data = Buffer.from(fs.readFileSync(entry.filename))
          await micropython.putFile(targetFn, data)
        }
      }
    }


  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

const sha256hash = async (filename) => {
  // logVerbose('sha256hash', filename)

  try {
    await ensureConnectedDevice()
    const hash = await micropython.getFileHash(filename)
    console.log(hash)
  } catch (e) {
    if (e instanceof ScriptExecutionError && e.message.includes('OSError: [Errno 2] ENOENT')) {
      logError(`sha256: cannot access '${filename}': No such file or directory`)
      return
    }
    console.error('Error:', e)
    process.exit(1)
  } finally {
    await micropython.disconnect()
  }
}

// Mount the device
const mountCommand = async (targetPath) => {
  console.log(`${CLR_FG_YELLOW}Mounting devices with FUSE is currently experimental! Please be careful, data might be corrupted. Reading files with binary data does not work, and maybe other things. -> https://github.com/metachris/micropython-ctl/issues/3${CLR_RESET}`)

  // Make sure FUSE dependencies are installed
  await checkAndInstallFuse()

  // Connect to the device
  await ensureConnectedDevice()

  // If device is disconnected, send SIGINT to self, which is handled by mount-device.ts (unmounts FUSE device)
  micropython.onclose = () => process.kill(process.pid, "SIGINT")

  // Mount now
  await mountWithFuse({ micropythonDevice: micropython, mountPath: targetPath })
}

const repl = async () => {
  try {
    await ensureConnectedDevice({ startWebserver: true })

    micropython.onclose = () => process.exit(0)
    micropython.onTerminalData = (data) => process.stdout.write(data)

    // Setup keyboard capture
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', async (_str, key) => {
      // Quit on Ctrl+K or Ctrl+X
      if (key.name === 'k' && key.ctrl) process.exit(0)
      if (key.name === 'x' && key.ctrl) process.exit(0)

      // Send anything to the device, if connected
      if (micropython.isConnected() && micropython.isTerminalMode()) {
        micropython.sendData(key.sequence)
      }
    });

    console.log('Exit REPL by pressing Ctrl+K or Ctrl+X')
  } catch (e) {
    console.log('Error:', e)
    await micropython.disconnect()
  }
}


// Mount the device
const runTests = async () => {
  runInternalTests()
}

/**
 * Setup command line commands, using commander.js
 * https://github.com/tj/commander.js
 */
program.option('-t, --tty <device>', `Connect over serial interface (eg. /dev/tty.SLAB_USBtoUART)`)
program.option('-h, --host <host>', `Connect over network to hostname or IP of device`)
program.option('-p, --password <password>', `Password for network device`)
program.option('-s, --silent', `Hide unnecessary output`)

// Command: devices
program
  .command('devices')
  .description('List serial devices')
  .action(cmdListDevices);

// Command: repl
program
  .command('repl')
  .description('Open a REPL terminal')
  .action(repl);

// Command: run
program
  .command('run <fileOrCommand>')
  .description('Execute a Python file or command')
  .action(run);

// Command: info
program
  .command('info')
  .option('-j, --json', 'Output JSON')
  .description('Get information about the board (versions, unique id, space, memory)')
  .action(boardInfo);

// Command: ls
program
  .command('ls [directory]')
  .option('-r, --recursive', 'List recursively')
  .option('-j, --json', 'Output JSON')
  .option('--include-hash', 'Include sha256 hash of each file')
  .description('List files on a device')
  .action(listFilesOnDevice);

// Command: cat
program
  .command('cat <filename>')
  .description('Print content of a file on the device')
  .action(catFile);

// Command: get
program
  .command('get <file_or_dirname> [out_file_or_dirname]')
  .description(`Download a file or directory from the device. Download everything with 'get /'`)
  .action(get);

// Command: put
program
  .command('put <file_or_dirname> [dest_file_or_dirname]')
  .option('-c, --changed-only', 'Upload only if changed (useful for large files, but needs to calculate hash)')
  .description('Upload a file or directory onto the device')
  .action(put);

// Command: sync
program
  .command('sync [directory]')
  .description('Sync a local directory onto the device root (upload new/changes files, delete missing)')
  .action(sync);

// Command: edit
program
  .command('edit <filename>')
  .description('Edit a file, and if changed upload afterwards')
  .action(edit);

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

// Command: mv
program
  .command('mv <oldPath> <newPath>')
  .description('Rename a file or directory')
  .action(mv);

// Command: filehash
program
  .command('sha256 <filename>')
  .description('Get the SHA256 hash of a file')
  .action(sha256hash);

// Command: reset
program
  .command('reset')
  .alias('reboot')
  .option('--soft', 'soft-reset instead of hard-reset')
  .description('Reset the MicroPython device')
  .action(reset);

// Command: mount
program
  .command('mount [targetPath]')
  .description('Mount a MicroPython device (over serial or network)')
  .action(mountCommand);

// Command: run-tests
program
  .command('run-tests')
  .description('Run micropython-ctl tests on a device')
  .action(runTests);

// Command: version
program
  .command('version')
  .description('Print the version of mctl')
  .action(() => {
    console.log(`v${pjson.version}`);
  });

program.addHelpText('after', `\nhttps://github.com/metachris/micropython-ctl v${pjson.version}`);

(async () => {
  await program.parseAsync(process.argv);

  // const options = program.parse(process.argv);
  // console.log(options.tty)

  // await ensureConnectedDevice()
  // const data = Buffer.from(fs.readFileSync('boot.py'))
  // const isSame = await micropython.isFileTheSame('boot.py', data)
  // console.log('isSame', isSame)
  // await micropython.disconnect()
})();
