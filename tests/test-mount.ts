/**
 * In progress, not yet working. Digging up bugs ;)
 */
import { spawn, execSync, SpawnOptions, ChildProcess } from 'child_process';
import fs, { writeFileSync } from 'fs'
import path from 'path'
import assert from 'assert'
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

process.once('SIGINT', () => {
  console.log('sigint')
  m.kill()
})

const runMountTests = async (mountPath = './mnt') => {
  console.log(`Starting 'mctl mount' and waiting 5 seconds...`)
  m.start()
  await delayMillis(5000)

  const testDir = mountPath + '/_mctl_tests'
  // console.log('setup test path', testDir, ',,,')
  // execSync(`rm -rf ${testDir}`)
  // fs.mkdirSync(testDir)
  // fs.readdirSync(mountPath)

  // b1: ascii text file
  // const b1 = Buffer.from('this is a testfile')
  // const b1Hash = crypto.createHash('sha256').update(b1).digest('hex')
  // const b1fn = testDir + '/file1.txt'

  // b2: random bytes
  const b2 = fs.readFileSync('./foo.txt')
  // const b2 = Buffer.from(crypto.randomBytes(10))
  // const b2 = Buffer.from('foo')
  const b2Hash = crypto.createHash('sha256').update(b2).digest('hex')
  // const b2fn = testDir + '/file2.bin'
  // writeFileSync('./file2.bin', b2)

  // write files
  // console.log('write files...')
  // fs.writeFileSync(b1fn, b1)
  // fs.writeFileSync(b2fn, b2)

  // await delayMillis(50000)

  // console.log(`exit 'mctl mount' and wait 5 sec...`)
  // m.kill()
  // await delayMillis(5000)

  // console.log(`Starting 'mctl mount' and waiting 5 seconds...`)
  // m.start()
  // await delayMillis(5000)

  // console.log('Reading files in testdir...')
  // const files = fs.readdirSync(testDir)
  // console.log(files)
  // assert(files.length === 2)

  // console.log('Comparing filesize via fs.stat...')
  // const b1nStat = fs.statSync(b1fn)
  // const b2nStat = fs.statSync(b2fn)
  // assert(b1nStat.size === 18)
  // assert(b2nStat.size === b2.length)

  // console.log('Reading files and comparing content...')
  // // const b1n = fs.readFileSync(b1fn)
  // const b2n = fs.readFileSync(b2fn)
  const b2n = fs.readFileSync('mnt/foo.txt')
  // // const b1nHash = crypto.createHash('sha256').update(b1n).digest('hex')
  const b2nHash = crypto.createHash('sha256').update(b2n).digest('hex')
  // // assert(b1nHash === b1Hash, `Hash mismatch for ${b1fn}`)

  console.log('b2', b2, b2Hash)
  console.log('b2n', b2n, b2nHash)

  // console.log('b2Hash', b2Hash, b2)
  // console.log('b2nHash', b2nHash, b2n)
  // assert(b2nHash === b2Hash, `Hash mismatch for ${b2fn}`)
  assert(b2nHash === b2Hash)
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
