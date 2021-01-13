/**
 * This is a test script, to check all commands on a physical device
 */
import { MicroPythonDevice } from '../src/main';
// import { MicroPythonDevice } from 'micropython-ctl';
import assert from 'assert'
import crypto from 'crypto';
import { Buffer } from 'buffer/'
import SerialPort from 'serialport';
import { delayMillis } from '../src/utils';

// Get first serial device
const getSerialDevice = async () => {
  if (process.env.DEVICE_SERIAL) return process.env.DEVICE_SERIAL
  const devices = await SerialPort.list();
  const goodDevices = devices.filter(device => device.manufacturer || device.serialNumber)
  if (!goodDevices.length) throw new Error('No serial devices found')
  return goodDevices[0].path
}

const runBasicTests = async (micropython: MicroPythonDevice) => {
  try {
    assert(micropython.isConnected())
    assert(micropython.isTerminalMode())

    console.log('- testing repl mode')
    let terminalDataReceived = ''
    micropython.onTerminalData = (data) => terminalDataReceived += data
    micropython.sendData('\x03\x02')
    micropython.sendData('foo')
    await delayMillis(1000)
    // console.log('terminalDataReceived', terminalDataReceived)
    assert(terminalDataReceived.trim().endsWith('>>> foo'))
    micropython.onTerminalData = (_data: string) => {}

    if (micropython.isSerialDevice()) {
      // Serial device keeps connection alive on reset
      console.log('- testing hard reset')
      let terminalData = ''
      micropython.onTerminalData = (data) => terminalData += data
      await micropython.reset({ broadcastOutputAsTerminalData: true })
      // await delayMillis(1000)
      assert(terminalData.includes('cpu_start:'))
      assert(terminalData.includes('heap_init:'))
      micropython.onTerminalData = (_data: string) => {}
    }

    console.log('- creating test directory')
    const testPath = '/MicroPythonCtlTestRun'
    const statTestPath = await micropython.statPath(testPath)
    if (statTestPath.exists) { await micropython.remove(testPath, true) }

    // Create test
    await micropython.mkdir(testPath)
    const filesInTestDir1 = await micropython.listFiles(testPath)
    // console.log(filesInTestDir1)

    const b1 = Buffer.from('this is a testfile')
    const b1fn = testPath + '/file1.txt'
    const b2 = Buffer.from(crypto.randomBytes(2742))
    const b2Hash = crypto.createHash('sha256').update(b2).digest('hex')
    const b2fn = testPath + '/file2.txt'

    console.log('- put file 1 (small)')
    await micropython.putFile(b1fn, b1)

    console.log('- put file 2 (large)')
    await micropython.putFile(b2fn, b2)

    console.log('- listing files...')
    const filesInTestDir2 = await micropython.listFiles(testPath)
    // console.log(filesInTestDir2)
    assert(filesInTestDir2.length = 2)
    assert(filesInTestDir2[0].size === 18)
    assert(filesInTestDir2[1].size === b2.length)

    console.log('- downloading large file, check if equal to original...')
    const b2ContentsAfter = await micropython.getFile(b2fn)
    const b2HashAfter = crypto.createHash('sha256').update(b2ContentsAfter).digest('hex')
    assert(b2Hash === b2HashAfter)

    console.log('- creating subdirectories')
    await micropython.mkdir(testPath + '/subpath1')
    await micropython.mkdir(testPath + '/subpath1/subsub1')
    await micropython.mkdir(testPath + '/subpath2')

    console.log('- uploading file into /subpath1')
    await micropython.putFile(testPath + '/subpath1/file1.txt', b1)

    console.log('- check listFiles recursive')
    const filesInTestDir3 = await micropython.listFiles(testPath, { recursive: true })
    const onlyDirs = filesInTestDir3.filter(file => file.isDir)
    const onlyFiles = filesInTestDir3.filter(file => !file.isDir)
    assert(onlyDirs.length === 4)
    assert(onlyFiles.length === 3)

    console.log('- removing a file and checking listFiles')
    await micropython.remove(b1fn)
    const filesInTestDir4 = await micropython.listFiles(testPath, { recursive: true })
    const onlyFiles4 = filesInTestDir4.filter(file => !file.isDir)
    assert(onlyFiles4.length === 2)

    console.log('- removing subpath1 recursively')
    await micropython.remove(testPath + '/subpath1', true)
    const filesInTestDir5 = await micropython.listFiles(testPath, { recursive: true })
    const onlyDirs5 = filesInTestDir5.filter(file => file.isDir)
    const onlyFiles5 = filesInTestDir5.filter(file => !file.isDir)
    assert(onlyDirs5.length === 2)
    assert(onlyFiles5.length === 1)

    console.log('- statPath')
    const stat1 = await micropython.statPath(testPath)
    assert(stat1.exists && stat1.isDir)
    const stat2 = await micropython.statPath(b2fn)
    assert(stat2.exists && !stat2.isDir && stat2.size === b2.length)

    console.log('- rename')
    await micropython.rename(b2fn, b2fn + 'xxx')
    const statOld = await micropython.statPath(b2fn)
    const statNew = await micropython.statPath(b2fn + 'xxx')
    assert(!statOld.exists)
    assert(statNew.exists && !statNew.isDir && statNew.size === b2.length)

    console.log('- disconnect')
    let isClosed = false
    micropython.onclose = () => isClosed = true
    await micropython.disconnect()
    await delayMillis(100)
    assert(isClosed)
    assert(!micropython.isConnected())

    // ALL DONE
    console.log('\n✅ all checks completed')

  } catch (e) {
    console.error(e)
    process.exit(1)

  } finally {
    await micropython.disconnect()
  }
}

(async () => {
  const micropython = new MicroPythonDevice();

  // Run tests over serial connection
  const serialDevice = await getSerialDevice()
  console.log('Testing serial device', serialDevice)
  await micropython.connectSerial(serialDevice)
  assert(micropython.isSerialDevice())
  runBasicTests(micropython)
})()
