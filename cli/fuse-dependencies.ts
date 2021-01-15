/**
 * Helper to check and install the fuse dependencies.
 *
 * Linux + macOS: https://github.com/fuse-friends/fuse-native
 * Windows: https://github.com/dokan-dev/dokany + https://github.com/direktspeed/node-fuse-bindings
 */
import * as path from 'path'
import * as readline from 'readline'
import { isInstalledGlobally } from './utils'
import { execSync } from 'child_process';

const isWin = process.platform === 'win32'
const isLinux = process.platform === 'linux'

const askQuestion = (query: string): Promise<string> => {
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
  const cmd = isInstalledGlobally() ? 'npm install -g fuse-native' : 'npm install fuse-native'
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
  const cmd = isInstalledGlobally() ? 'npm install -g node-fuse-bindings' : 'npm install node-fuse-bindings'
  console.log('To mount a device, you need to install https://github.com/direktspeed/node-fuse-bindings\n')
  const answer = await askQuestion(`Execute command '${cmd}'? [Y/n] `)
  const doInstall = !answer || answer.toLowerCase() === 'y'
  if (!doInstall) return false

  // Install the module. If it fails, the process exits
  execSync(cmd, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname)
  })

  if (isLinux && !process.env.MCTL_MOUNT_RISK_SEGFAULT) {
    // In Linux we need to exit here, because when installed globally, the next require will cause a segfault
    console.log(`Successfully installed dependencies. Please re-run 'mctl mount' now`)
    process.exit(0)
  }
  return true
}

export const checkAndInstall = async () => {
  // Run check and installation process
  if (isWin) {
    await checkFuseOnWindows()
    require('node-fuse-bindings')
  } else {
    await checkFuseOnLinuxMacOS()
    require('fuse-native')  // TODO: here gives a segfault on Linux
  }
}

// checkAndInstall()
