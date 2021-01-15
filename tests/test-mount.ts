import { spawn, execSync, SpawnOptions, ChildProcess } from 'child_process';
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { delayMillis } from '../src/utils';

class MctlRunner {
  private proc: ChildProcess
  private allowedToExit: boolean

  async start(verbose = false) {
    const spawnOpts: SpawnOptions = {
      stdio: verbose ? 'inherit' : undefined
    }

    this.allowedToExit = false
    this.proc = spawn('yarn', ['mctl', 'mount'], spawnOpts)

    this.proc.on('exit', () => {
      if (!this.allowedToExit) {
        console.error('mctl mount exited unexpectedly!')
        process.exit(1)
      }
    })
  }

  kill() {
    this.allowedToExit = true
    this.proc.kill()
  }
}

const m = new MctlRunner()

const runMountTests = async (mountPath = './mnt') => {
  console.log(`Starting 'mctl mount' and waiting 7 seconds...`)
  m.start(true)
  await delayMillis(7000)

  const testDir = mountPath + '/_mctl_tests'
  console.log('setup test path', testDir, ',,,')
  execSync(`rm -rf ${testDir}`)
  fs.mkdirSync(testDir)
  fs.readdirSync(mountPath)

  // // b1: ascii text file
  // const b1 = Buffer.from('this is a testfile')
  // const b1Hash = crypto.createHash('sha256').update(b1).digest('hex')
  // const b1fn = testDir + '/file1.txt'

  // // b2: random bytes
  // const b2 = Buffer.from(crypto.randomBytes(2742))
  // const b2Hash = crypto.createHash('sha256').update(b2).digest('hex')
  // const b2fn = testDir + '/file2.bin'

  // // write files
  // console.log('write files...')
  // fs.writeFileSync(b1fn, b1)
  // fs.writeFileSync(b2fn, b2)

  // console.log(`exit 'mctl mount' and wait 5 sec...`)
  // mctlAllowedToExit = true
  // mctlProc.kill('SIGINT')
  // await delayMillis(5000)

  // console.log(`Starting 'mctl mount' and waiting 5 seconds...`)
  // startMctlMount()
  // await delayMillis(5000)

  // const files = fs.readdirSync(testDir)
  // console.log(files)
}

(async () => {
  try {
    await runMountTests()
  } catch (e) {
    console.error('Test with error!')
    console.error(e)
  } finally {
    console.log('Shutting down...')
    m.kill()
  }
})();
