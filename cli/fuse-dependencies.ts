/**
 * Helper to check and install the fuse dependencies.
 *
 * Linux + macOS: https://github.com/fuse-friends/fuse-native
 * Windows: https://github.com/dokan-dev/dokany + https://github.com/direktspeed/node-fuse-bindings
 */
import * as path from 'path'
import * as readline from 'readline'
import { execSync } from 'child_process';

// tslint:disable-next-line: no-var-requires
const commandExists = require('./command-exists').sync

const isWin = process.platform === 'win32'

const askQuestion = (query): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }))
}

// Works for both Linux and macOS
const checkFuseOnLinuxMacOS = async (): Promise<boolean> => {
  try {
    // tslint:disable-next-line: no-var-requires
    require('fuse-native')
    return true
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e
  }

  // Module not found...
  const useYarn = commandExists('yarn')
  const cmd = useYarn ? 'yarn add fuse-native' : 'npm install fuse-native'

  console.log('To mount a device, you need to install the fuse-native npm package.\n')
  const answer = await askQuestion(`Execute command '${cmd}' now? [Y/n] `)
  const doInstall = !answer || answer.toLowerCase() === 'y'
  if (!doInstall) return false

  // Install the module. If it fails, the process exits
  execSync(cmd, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname)
  })
  return true
}

const checkFuseOnWindows = async (): Promise<boolean> => {
  try {
    // tslint:disable-next-line: no-var-requires
    require('node-fuse-bindings')
    return true
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e
  }

  // Check if dokan is installed
  const isDokanInstalled = !!process.env.DokanLibrary1
  if (!isDokanInstalled) {
    console.log('Please download and install Dokan: https://github.com/dokan-dev/dokany/wiki/Installation (FUSE driver for Windows).')
    console.log('Then run this script again.')
    return false
  }

  // Install node-fuse-bindings
  const useYarn = commandExists('yarn')
  const cmd = useYarn ? 'yarn add node-fuse-bindings' : 'npm install node-fuse-bindings'
  console.log('To mount a device, you need to install https://github.com/direktspeed/node-fuse-bindings\n')
  const answer = await askQuestion(`Execute command '${cmd}'? [Y/n] `)
  const doInstall = !answer || answer.toLowerCase() === 'y'
  if (!doInstall) return false

  // Install the module. If it fails, the process exits
  execSync(cmd, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname)
  })
  return true
}

export const checkAndInstall = async () => {
  // Run check and installation process
  const ready = process.platform === 'win32' ? await checkFuseOnWindows() : await checkFuseOnLinuxMacOS()

  // Verify that everything has been installed, else exits process with nice error message
  require(isWin ? 'node-fuse-bindings' : 'fuse-native')
}

// checkAndInstall()
