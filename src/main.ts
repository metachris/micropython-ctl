/**
 * Async TypeScript MicroPython interface (for serial and network connections, REPL & WebREPL)
 *
 * - License: MIT
 * - Repository: https://github.com/metachris/micropython-ctl
 * - Author: chris@linuxuser.at / https://twitter.com/metachris
 */
import WebSocket from 'isomorphic-ws'
import { Buffer } from 'buffer/'
import { InvalidPassword, CouldNotConnect, ScriptExecutionError } from './errors'
import { debug, dedent, IS_ELECTRON, IS_NODEJS } from './utils';
import * as PythonScripts from './python-scripts';

export { InvalidPassword, CouldNotConnect, ScriptExecutionError }  // allows easy importing from user scripts

const delayMillis = (delayMs: number) => new Promise(resolve => setTimeout(resolve, delayMs));

export enum ConnectionMode {
  SERIAL = "SERIAL",
  NETWORK = "NETWORK",
}

export enum ConnectionState {
  CONNECTING = 'CONNECTING',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum ReplMode {
  TERMINAL = 'TERMINAL',  // direct IO with user/program
  SCRIPT_RAW_MODE = 'SCRIPT_RAW_MODE',  // RAW mode for script execution

  GETVER_WAITING_RESPONSE = 'GETVER_WAITING_RESPONSE',
  PUTFILE_WAITING_FIRST_RESPONSE = 'PUTFILE_WAITING_FIRST_RESPONSE',
  PUTFILE_WAITING_FINAL_RESPONSE = 'PUTFILE_WAITING_FINAL_RESPONSE',
}

export enum RawReplState {
  ENTERING = 'ENTERING',
  WAITING_FOR_INPUT = 'WAITING_FOR_INPUT',
  SCRIPT_SENT = 'SCRIPT_SENT',
  SCRIPT_RECEIVING_RESPONSE = 'SCRIPT_RECEIVING_RESPONSE',
  CHANGING_TO_FRIENDLY_REPL = 'CHANGING_TO_FRIENDLY_REPL',
}

enum RawReplReceivingResponseSubState {
  SCRIPT_RECEIVING_OUTPUT = 'SCRIPT_RECEIVING_OUTPUT',
  SCRIPT_RECEIVING_ERROR = 'SCRIPT_RECEIVING_ERROR',
  SCRIPT_WAITING_FOR_END = 'SCRIPT_WAITING_FOR_END',
}

type promiseResolve = (value: string | PromiseLike<string>) => void;
type promiseReject = (reason: any) => void;

export interface DeviceState {
  connectionMode: ConnectionMode

  port: any
  ws: WebSocket | null
  wsConnectTimeout: NodeJS.Timeout | undefined;
  wsConnectTimeoutTriggered: boolean

  connectionState: ConnectionState
  replMode: ReplMode // only if replState is connected
  replPassword: string

  // promise helpers for user script
  replPromise: Promise<string> | null;  // helper to await command executions
  replPromiseResolve: promiseResolve | null
  replPromiseReject: promiseReject | null

  rawReplState: RawReplState

  lastCommand: string
  inputBuffer: string
  errorBuffer: string
  broadcastCommandOutputAsTerminalData: boolean

  dataRawBuffer: Buffer

  lastRunScriptTimeNeeded: number
  receivingResponseSubState: RawReplReceivingResponseSubState

  putFileSize: number
  putFileData: Uint8Array
  putFileName: string
  putFileDest: string
}

interface WindowWithWebRepl extends Window {
  [x: string]: any;
  testWindow: any;
  webReplState: DeviceState | undefined
}

export interface FileListEntry { filename: string, size: number, isDir: boolean }

declare const window: WindowWithWebRepl;

/**
 * The main class for a MicroPython device connection
 *
 * ```
 * const micropython = new MicroPythonDevice()
 *
 * // Connect to micropython device over network
 * await micropython.connectNetwork('DEVICE_IP', 'WEBREPL_PASSWORD')
 *
 * // Or connect to micropython device over serial interface
 * await micropython.connectSerial('/dev/ttyUSB0')
 *
 * // Run a Python script and capture the output
 * const output = await micropython.runScript('import os; print(os.listdir())')
 *
 * // List all files in the root
 * const files = await micropython.listFiles()
 * ```
 */
export class MicroPythonDevice {
  onclose: () => void
  onTerminalData: (data: string) => void  // user callback
  private state: DeviceState

  private getInitState(): DeviceState {
    return {
      connectionMode: ConnectionMode.NETWORK,
      connectionState: ConnectionState.CLOSED,

      port: null,
      ws: null,
      wsConnectTimeout: undefined,
      wsConnectTimeoutTriggered: false,

      replMode: ReplMode.TERMINAL,

      replPassword: '',
      lastCommand: '',
      inputBuffer: '',
      errorBuffer: '',
      broadcastCommandOutputAsTerminalData: false,
      dataRawBuffer: new Buffer(0),

      replPromise: null,
      replPromiseResolve: null,
      replPromiseReject: null,

      rawReplState: RawReplState.WAITING_FOR_INPUT,
      lastRunScriptTimeNeeded: -1,
      receivingResponseSubState: RawReplReceivingResponseSubState.SCRIPT_RECEIVING_ERROR,

      putFileSize: 0,
      putFileData: new Uint8Array(),
      putFileName: '',
      putFileDest: '',
    }
  }

  constructor() {
    this.state = this.getInitState()
  }

  isConnected() {
    return this.state.connectionState === ConnectionState.OPEN
  }

  isSerialDevice() {
    return this.state.connectionMode === ConnectionMode.SERIAL
  }

  isTerminalMode() {
    return this.state.replMode === ReplMode.TERMINAL
  }

  getState() {
    return this.state
  }

  private createReplPromise(): Promise<string> {
    this.state.replPromise = new Promise((resolve, reject) => {
      this.state.replPromiseResolve = resolve
      this.state.replPromiseReject = reject
    })
    return this.state.replPromise
  }

  /**
   * Connect to a device over the serial interface
   *
   * @param path Serial interface (eg. `/dev/ttyUSB0`, `/dev/tty.SLAB_USBtoUART`, ...)
   * @throws {CouldNotConnect} Connection failed
   */
  public async connectSerial(path: string) {
    debug('connectSerial', path)
    // Connect to serial device
    this.state.connectionMode = ConnectionMode.SERIAL
    this.state.connectionState = ConnectionState.CONNECTING
    this.clearBuffer()

    if (IS_ELECTRON) {
      this.state.port = new window.SerialPort(path, { baudRate: 115200 })
    } else if (IS_NODEJS) {
      const SerialPort = require('serialport')
      this.state.port = new SerialPort(path, { baudRate: 115200 })
    } else {
      throw new Error('Cannot use connectSerial from a browser')
    }

    // Add error listener
    this.state.port.on('error', (err: string) => {
      if (this.state.replPromiseReject) {
        debug(err)
        const e = this.state.connectionState === ConnectionState.CONNECTING ? new CouldNotConnect(err.toString()) : err
        this.state.replPromiseReject(e)
      } else {
        throw err
      }
    })

    // Add data listener
    this.state.port.on('data', (data: Buffer) => {
      // debug('Data:', data, data.toString())
      this.handleProtocolData(data)
    })

    this.state.port.on('close', () => {
      this.state.connectionState = ConnectionState.CLOSED
      if (this.onclose) this.onclose()
    })

    this.state.port.write('\x03\x02')  // Sending Ctrl+C and Ctrl+B, to receive the info that we are in REPL mode
    return this.createReplPromise()
  }

  /**
   * Connect to a device over the network (requires enabled WebREPL)
   *
   * @param host IP address or hostname
   * @param password webrepl password
   * @param timeoutSec Connection timeout (default: 5 sec). To disable, set to 0
   * @throws {CouldNotConnect} Connection failed
   */
  public async connectNetwork(host: string, password: string, timeoutSec = 5): Promise<string> {
    this.state.connectionMode = ConnectionMode.NETWORK

    // check if already a websocket connection active
    if (this.state.ws && this.state.ws.readyState !== WebSocket.CLOSED) {  // see also https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
      console.warn("webrepl: Cannot connect, already active ws connection", this.state.ws)
      return ''
    }

    const uri = `ws://${host}:8266`
    // console.log('connect', uri)
    this.state.connectionState = ConnectionState.CONNECTING
    this.state.replPassword = password

    this.state.ws = new WebSocket(uri)
    this.state.ws.binaryType = 'arraybuffer'

    // Set the connect timeout
    if (timeoutSec) {
      this.state.wsConnectTimeout = setTimeout(() => {
        this.state.wsConnectTimeoutTriggered = true
        this.state.ws?.close()
      }, timeoutSec * 1000)
    }

    // On connection established, clear the timeout
    this.state.ws.onopen = () => { if (this.state.wsConnectTimeout) clearTimeout(this.state.wsConnectTimeout) }

    // Handle messages
    this.state.ws.onmessage = (event) => this.handleWebsocketMessage(event)

    // Handle errors
    this.state.ws.onerror = (err) => {
      if (this.state.wsConnectTimeoutTriggered) {
        if (this.state.replPromiseReject) this.state.replPromiseReject(new CouldNotConnect("Connect timeout"))
        return
      }

      const e = this.state.connectionState === ConnectionState.CONNECTING ? new CouldNotConnect(err.message) : err
      if (this.state.replPromiseReject) this.state.replPromiseReject(e)
    }

    this.state.ws.onclose = () => {
      // console.log(`WebSocket onclose`)
      this.state.connectionState = ConnectionState.CLOSED
      if (this.state.replPromiseResolve) this.state.replPromiseResolve('') // release the 'close' async event
      if (this.onclose) this.onclose()
    }

    // create and return a new promise, which is fulfilled only after connecting to repl
    return this.createReplPromise()
  }

  /**
   * Handle special WebREPL only commands data
   *
   * getver, putfile, getfile
   */
  private handlProtocolSpecialCommandsOutput(data: Uint8Array) {
    // helper to decode the binary data
    const decodeWebreplBinaryResponse = (_data: Uint8Array) => {
      if (_data[0] === 'W'.charCodeAt(0) && _data[1] === 'B'.charCodeAt(0)) {
        // tslint:disable-next-line: no-bitwise
        const code = _data[2] | (_data[3] << 8);
        return code;
      } else {
        return -1;
      }
    }

    // HANDLE SPECIFIC SPECIAL COMMANDS (getver, putfile, getfile)
    if (this.state.replMode === ReplMode.PUTFILE_WAITING_FIRST_RESPONSE) {
      // PUTFILE
      if (decodeWebreplBinaryResponse(data) === 0) {
        // send file data in chunks
        for (let offset = 0; offset < this.state.putFileSize; offset += 1024) {
          this.sendData(this.state.putFileData.slice(offset, offset + 1024));
        }
        this.state.replMode = ReplMode.PUTFILE_WAITING_FINAL_RESPONSE;
      }

    } else if (this.state.replMode === ReplMode.PUTFILE_WAITING_FINAL_RESPONSE) {
      // final response for put
      if (decodeWebreplBinaryResponse(data) === 0) {
        debug('Upload success');
        if (this.state.replPromiseResolve) this.state.replPromiseResolve('')
      } else {
        console.error('Upload failed');
        if (this.state.replPromiseReject) this.state.replPromiseReject('Upload failed')
      }
      this.state.replMode = ReplMode.TERMINAL

    } else if (this.state.replMode === ReplMode.GETVER_WAITING_RESPONSE) {
      // GETVER
      // console.log('got getver response:', data, data.toString())
      if (this.state.replPromiseResolve) this.state.replPromiseResolve(data.join("."))

    } else {
      console.log('unkown ArrayBuffer input:', data)
    }
  }

  private handleWebsocketMessage(event: WebSocket.MessageEvent) {
    const dataStr = event.data.toString()
    // console.log(`onWebsocketMessage:${event.data instanceof ArrayBuffer ? ' [ArrayBuffer]' : ''}${data.endsWith('\n') ? ' [End:\\n]' : ''}${data.length < 3 ? ' [char0:' + data.charCodeAt(0) + ']'  : ''}`, data.length, data)

    // On closing a ws connection there may be special final bytes (discard)
    if (this.state.ws!.readyState === WebSocket.CLOSING && dataStr.length === 2 && dataStr.charCodeAt(0) === 65533 && dataStr.charCodeAt(1) === 0) return

    // Handle connecting: enter password and if incorrect throw InvalidPassword
    if (this.state.connectionState === ConnectionState.CONNECTING) {
      const dataTrimmed = dataStr.trim()
      if (dataTrimmed === 'Password:') {
        this.state.ws!.send(this.state.replPassword + '\r')
        return

      } else if (dataTrimmed === 'Access denied') {
        this.state.ws!.close()  // just to be sure. micropy already closes the connection
        if (this.state.replPromiseReject) this.state.replPromiseReject(new InvalidPassword('REPL password invalid'))
        return
      }
    }

    // If data is of type ArrayBuffer, it's a special WebREPL protocol input
    if (event.data instanceof ArrayBuffer) {
      const binData = new Uint8Array(event.data);
      this.handlProtocolSpecialCommandsOutput(binData)
      return
    }

    // IMPORTANT: WebSocket from Browser always delivers incoming data as string, whereas in Node.js not necessarily!
    // Also Uint8Array behaves different than in Node.js, which is why we use https://www.npmjs.com/package/buffer (works in both browser and Node.js)
    const buf = Buffer.from(event.data as string)
    this.handleProtocolData(buf)
  }

  private clearBuffer() {
    this.state.inputBuffer = ''
    this.state.errorBuffer = ''
    this.state.dataRawBuffer = new Buffer(0)
  }

  /**
   * Handle incoming data
   */
  private handleProtocolData(data: Buffer) {
    // debug('handleProtocolData:', data)

    // Special protocol modes: GET_VER, GET_FILE, PUT_FILE
    if (this.state.replMode === ReplMode.GETVER_WAITING_RESPONSE) {
      return this.handlProtocolSpecialCommandsOutput(data)
    }

    // If in terminal mode, just pass terminal on to user defined handler
    if (this.isConnected() && this.state.replMode === ReplMode.TERMINAL) {
      if (this.onTerminalData) this.onTerminalData(data.toString())
      return
    }

    // Extend raw data buffer (data may come in as chunks with arbitrary length)
    this.state.dataRawBuffer = Buffer.concat([this.state.dataRawBuffer, data])

    // Perpare strings for easy access
    const dataStr = this.state.dataRawBuffer.toString()
    const dataTrimmed = dataStr.trim()

    // debug('handleProtocolData', data, '=>', dataStr)

    // If connecting, wait until first REPL input prompt
    if (this.state.connectionState === ConnectionState.CONNECTING) {
      if (dataStr.trim().endsWith('>>>')) {
        this.state.connectionState = ConnectionState.OPEN
        this.state.replMode = ReplMode.TERMINAL
        this.clearBuffer()
        debug('connected')
        if (this.state.replPromiseResolve) this.state.replPromiseResolve('')
      }
      return
    }

    // Handle RAW_MODE data (entering, receiving response, receiving error, waiting for end, changing back to friendly repl)
    if (this.state.replMode === ReplMode.SCRIPT_RAW_MODE) {
      if (this.state.rawReplState === RawReplState.ENTERING && dataTrimmed.endsWith(`raw REPL; CTRL-B to exit\r\n>`)) {
        this.state.replMode = ReplMode.SCRIPT_RAW_MODE
        this.clearBuffer()
        if (this.state.replPromiseResolve) this.state.replPromiseResolve('')
        return
      }

      if (this.state.rawReplState === RawReplState.SCRIPT_SENT) {
        // After script is sent, we wait for OK, then stdout_output, then \x04, then stderr_output
        // OK[ok_output]\x04[error_output][x04]>
        if (dataStr === 'OK') {
          // debug('ok received, start collecting input')
          this.clearBuffer()
          this.state.rawReplState = RawReplState.SCRIPT_RECEIVING_RESPONSE
          this.state.receivingResponseSubState = RawReplReceivingResponseSubState.SCRIPT_RECEIVING_OUTPUT
        }
        return
      }

      // SCRIPT OUTPUT: OK[ok_output]\x04[error_output][x04]>
      if (this.state.rawReplState === RawReplState.SCRIPT_RECEIVING_RESPONSE) {

        // iterate over received bytes
        for (const entry of data) {
          // debug(entry)

          // There are 3 special markers: switching from output to error, from error to waiting for end, and
          if (entry === 0x04 && this.state.receivingResponseSubState === RawReplReceivingResponseSubState.SCRIPT_RECEIVING_OUTPUT) {
            // debug('switch to error mode')
            this.state.receivingResponseSubState = RawReplReceivingResponseSubState.SCRIPT_RECEIVING_ERROR
          } else if (entry === 0x04 && this.state.receivingResponseSubState === RawReplReceivingResponseSubState.SCRIPT_RECEIVING_ERROR) {
            // debug('switch to end mode')
            this.state.receivingResponseSubState = RawReplReceivingResponseSubState.SCRIPT_WAITING_FOR_END
          } else if (entry === 62 && this.state.receivingResponseSubState === RawReplReceivingResponseSubState.SCRIPT_WAITING_FOR_END) {
            // ALL DONE, now trim the buffers and resolve the promises
            // debug('all done!!!')

            this.state.inputBuffer = this.state.inputBuffer.trim()
            this.state.errorBuffer = this.state.errorBuffer.trim()
            // console.log('END', this.state.inputBuffer, this.state.errorBuffer)
            this.state.rawReplState = RawReplState.WAITING_FOR_INPUT

            if (this.state.errorBuffer.length > 0 && this.state.replPromiseReject) {
              this.state.replPromiseReject(new ScriptExecutionError(this.state.errorBuffer))
            } else if (this.state.replPromiseResolve) {
              this.state.replPromiseResolve(this.state.inputBuffer)
            }

          } else {
            // Incoming data (stdout or stderr output). Just add to buffer
            const char = String.fromCharCode(entry)
            if (this.state.broadcastCommandOutputAsTerminalData && this.onTerminalData) this.onTerminalData(char)
            if (this.state.receivingResponseSubState === RawReplReceivingResponseSubState.SCRIPT_RECEIVING_OUTPUT) {
              // debug('adding to buffer:', entry)
              this.state.inputBuffer += char
            } else {
              // debug('adding to error buffer:', entry)
              this.state.errorBuffer += char
            }
          }
        }

      } else if (this.state.rawReplState === RawReplState.CHANGING_TO_FRIENDLY_REPL) {
        // After executing a command, we change back to friendly repl (via exitRawRepl())
        if (dataTrimmed.endsWith('>>>')) {
          // debug('__ back in friendly repl mode')
          this.state.rawReplState = RawReplState.WAITING_FOR_INPUT
          this.state.replMode = ReplMode.TERMINAL
          if (this.state.replPromiseResolve) this.state.replPromiseResolve('')
        }
      }
    }
  }

  sendData(data: string | Buffer | ArrayBuffer) {
    if (this.state.connectionMode === ConnectionMode.NETWORK) {
      return this.wsSendData(data)
    } else {
      if (data instanceof ArrayBuffer) {
        this.serialSendData(Buffer.from(data))
      } else {
        this.serialSendData(data)
      }
    }
  }

  private serialSendData(data: string | Buffer) {
    // debug('serialSendData', data)
    this.state.port?.write(data)
  }

  private wsSendData(data: string | ArrayBuffer) {
    // debug('wsSendData', data)
    if (!this.state.ws || this.state.ws.readyState !== WebSocket.OPEN) {
      throw new Error('wsSendData: No open websocket')
    }
    this.state.ws.send(data)
  }

  public async disconnect() {
    if (this.isSerialDevice()) {
      await this.state.port?.close()
      this.state.connectionState = ConnectionState.CLOSED
    } else {
      await this.closeWebsocket()
    }
  }

  private async closeWebsocket() {
    if (this.state.ws && this.state.ws.readyState === WebSocket.OPEN) {
      // console.log('closing')
      this.state.ws.close()
      this.state.connectionState = ConnectionState.CLOSED
      return this.createReplPromise()
    } else {
      debug('Websocket already closed')
      return false
    }
  }

  /**
   *
   * @param script
   * @param disableDedent
   *
   * @throws {ScriptExecutionError} on Python code execution error
   */
  public async runScript(script: string, options: RunScriptOptions = {}): Promise<string> {
    debug('runScript', script)

    await this.enterRawRepl()
    debug('runScript: raw mode entered')

    // Prepare script for execution (dedent by default)
    if (!options.disableDedent) script = dedent(script)

    // Send data to raw repl. Note: cannot send too much data at once over the
    // network, else the webrepl can't parse it quick enough and returns an error.
    // Therefore we chunk the data and add a send delay.
    // 120b and 180ms delay seems to work well for all ESP32 devices.
    const chunkSize = this.isSerialDevice() ? 3000 : 120;  // how many bytes to send per chunk.
    const chunkDelayMillis = this.isSerialDevice() ? 0 : 200;  // fixed delay. a progressive delay doesn't seem to help
    debug(`runScript: ${script.length} bytes -> ${Math.ceil(script.length / chunkSize)} chunks`)

    while (script.length) {
      const chunk = script.substring(0, chunkSize)
      script = script.substr(chunkSize)
      this.sendData(chunk)
      await delayMillis(chunkDelayMillis)
    }

    // debug('runScript: script sent')
    const millisStart = Date.now()

    // Update state and create a new promise that will be fulfilled when script has run
    this.state.broadcastCommandOutputAsTerminalData = !!options.broadcastOutputAsTerminalData
    this.state.rawReplState = RawReplState.SCRIPT_SENT
    const promise = this.createReplPromise()

    // Send ctrl+D to execute the uploaded script in the raw repl
    this.sendData('\x04')
    debug('runScript: script sent, waiting for response')

    if (options.exitAfterSending) return ''

    // wait for script execution
    const scriptOutput = await promise
    debug(scriptOutput)

    const millisRuntime = Math.round(Date.now() - millisStart)
    debug(`runScript: script done (${millisRuntime / 1000}sec)`)
    this.state.lastRunScriptTimeNeeded = millisRuntime

    if (options.exitRawRepl) {
      // Exit raw repl mode, re-enter friendly repl
      await this.exitRawRepl()
    } else {
      // Stay in raw repl; clear the buffer now
      this.clearBuffer()
    }
    // debug('runScript: exited RAW repl')

    return scriptOutput
  }

  private async enterRawRepl() {
    // see also https://github.com/scientifichackers/ampy/blob/master/ampy/pyboard.py#L175
    // Prepare state for mode switch
    debug('enterRawRepl')
    if (this.state.replMode === ReplMode.SCRIPT_RAW_MODE) {
      return debug('enterRawRepl: already in raw repl mode')
    }

    this.state.replMode = ReplMode.SCRIPT_RAW_MODE
    this.state.rawReplState = RawReplState.ENTERING

    const promise = this.createReplPromise()
    // Send ctrl-C twice to interrupt any running program
    this.sendData('\r\x03')
    await delayMillis(100) // wait 0.1sec
    this.sendData('\x03')
    await delayMillis(100) // wait 0.1sec
    this.sendData('\x01')  // ctrl+A
    await delayMillis(100) // wait 0.1sec

    return promise
  }

  private async exitRawRepl() {
    // console.log('exitRawRepl')
    this.state.rawReplState = RawReplState.CHANGING_TO_FRIENDLY_REPL
    const promise = this.createReplPromise()
    this.sendData('\r\x02')
    return promise
  }

  public async getVer(): Promise<string> {
    // debug(`getVer`)
    if (this.isSerialDevice()) {
      throw new Error("getVer is not possible with a serial connection (only with webrepl)")
    }

    const promise = this.createReplPromise()

    this.state.replMode = ReplMode.GETVER_WAITING_RESPONSE

    // WEBREPL_REQ_S = "<2sBBQLH64s"
    const rec = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64);
    rec[0] = 'W'.charCodeAt(0);
    rec[1] = 'A'.charCodeAt(0);
    rec[2] = 3; // GET_VER

    // initiate put
    this.sendData(rec)
    const ret = await promise
    return ret
  }

  // public async uploadFile(filename: string, destFilename: string) {
  //   debug(`uploadFile: ${filename} -> ${destFilename}`)

  //   // const promise = this.createReplPromise()

  //   // this.state.replMode = WebReplMode.PUTFILE_WAITING_FIRST_RESPONSE
  //   // this.state.putFileName = filename
  //   // this.state.putFileDest = destFilename

  //   // this.state.putFileData = new Uint8Array(fs.readFileSync(filename))
  //   // this.state.putFileSize = this.state.putFileData.length
  //   // debug(`uploadFile: ${this.state.putFileSize} bytes`)

  //   // // WEBREPL_FILE = "<2sBBQLH64s"
  //   // const rec = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64);
  //   // rec[0] = 'W'.charCodeAt(0);
  //   // rec[1] = 'A'.charCodeAt(0);
  //   // rec[2] = 1; // put
  //   // rec[3] = 0;
  //   // rec[4] = 0; rec[5] = 0; rec[6] = 0; rec[7] = 0; rec[8] = 0; rec[9] = 0; rec[10] = 0; rec[11] = 0;
  //   // // tslint:disable-next-line: no-bitwise
  //   // rec[12] = this.state.putFileSize & 0xff; rec[13] = (this.state.putFileSize >> 8) & 0xff; rec[14] = (this.state.putFileSize >> 16) & 0xff; rec[15] = (this.state.putFileSize >> 24) & 0xff;
  //   // // tslint:disable-next-line: no-bitwise
  //   // rec[16] = this.state.putFileDest.length & 0xff; rec[17] = (this.state.putFileDest.length >> 8) & 0xff;
  //   // for (let i = 0; i < 64; ++i) {
  //   //   rec[18 + i] = i < this.state.putFileDest.length ? this.state.putFileDest.charCodeAt(i) : 0
  //   // }

  //   // // initiate put
  //   // this.sendData(rec)

  //   // return promise
  // }

  public async listFiles(directory: string = '/', options: ListFilesOptions = {}): Promise<FileListEntry[]> {
    const recursive = !!options.recursive

    debug(`listFiles: ${directory}, ${recursive}`)
    const output = await this.runScript(PythonScripts.ls({ directory, recursive }))
    const lines = output.split('\n')

    const ret: FileListEntry[] = []
    for (const line of lines) {
      const parts = line.split(' | ')
      if (parts[0] === '') continue
      ret.push({
        filename: parts[0],
        size: parseInt(parts[2], 10),
        isDir: parts[1] === 'd',
      })
    }
    return ret
  }

  public async getFile(filename: string): Promise<Buffer> {
    debug(`getFile: ${filename}`)
    const output = await this.runScript(PythonScripts.getFile(filename))
    return Buffer.from(output, 'hex')
  }

  public async statPath(path: string): Promise<{ exists: boolean, isDir: boolean, size: number }> {
    debug(`statPath: ${path}`)
    const statOutput = await this.runScript(PythonScripts.stat(path))
    if (statOutput.trim() === 'x') return { exists: false, isDir: false, size: 0 }

    const [isDir, size] = statOutput.split(' | ')
    return { exists: true, isDir: isDir === 'd', size: parseInt(size, 10) }
  }

  /**
   *
   * @param name
   * @throws {ScriptExecutionError}
   */
  public async mkdir(name: string): Promise<boolean> {
    debug(`mkdir: ${name}`)
    const script = `import os; os.mkdir('${name}')`
    await this.runScript(script)
    return true
  }

  /**
   * Uploading data to the device, saving as a file.
   *
   * We break the buffer into multiple chunks, and execute a raw repl command for each of them
   * in order to not fill up the device RAM.
   *
   * See also:
   * - https://github.com/dhylands/rshell/blob/master/rshell/main.py#L1079
   * - https://github.com/scientifichackers/ampy/blob/master/ampy/files.py#L209
   *
   * @param targetFilename
   * @param data
   */
  public async putFile(targetFilename: string, data: Buffer) {
    debug(`putFile: ${targetFilename} (${data.length})`)

    const promise = this.createReplPromise()
    const dataHex = data.toString('hex')
    const chunkSize = this.isSerialDevice() ? 256 : 64

    const script1 = `import ubinascii; f = open('${targetFilename}', 'wb')`
    await this.runScript(script1, { exitRawRepl: false }) // keeps raw repl open for next instruction

    for (let index = 0; index < dataHex.length; index += chunkSize) {
      const chunk = dataHex.substr(index, chunkSize)
      debug('chunk', chunk)
      const scriptForChunk = `f.write(ubinascii.unhexlify("${chunk}"))`
      await this.runScript(scriptForChunk, { exitRawRepl: false }) // keeps raw repl open for next instruction
    }

    await this.runScript('f.close()') // finally closes raw repl, switching back to friendly
    return true
  }

  /**
   * Remove a file or directory. Optional recursively
   *
   * @param path
   * @param recursive default: false
   *
   * @throws {ScriptExecutionError} if not found: "OSError: [Errno 2] ENOENT"
   * @throws {ScriptExecutionError} if directory not empty: "OSError: 39"
   */
  public async remove(path: string, recursive = false) {
    debug('remove', path, recursive)
    const script = recursive ? PythonScripts.deleteEverythingRecurive(path) : `import os; os.remove("${path}")`
    await this.runScript(script)
  }

  /**
   * Rename a file or directory (uos.rename)
   *
   * @throws {ScriptExecutionError} if not found: "OSError: [Errno 2] ENOENT"
   * @throws {ScriptExecutionError} if directory not empty: "OSError: 39"
   */
  public async rename(oldPath: string, newPath: string) {
    debug('rename', oldPath, newPath)
    const script = `import os; os.rename("${oldPath}", "${newPath}")`
    await this.runScript(script)
  }

  /**
   * Reset a device.
   */
  public async reset(options: ResetOptions = {}) {
    const script = options.softReset ? 'import sys; sys.exit()' : 'import machine; machine.reset()'
    debug('reset', script, options)

    // Need to exit after sending, because it will not exit the RAW repl mode like any other script
    // since the device is actually restarting.
    await this.runScript(script, {
      broadcastOutputAsTerminalData: options.broadcastOutputAsTerminalData,
      exitAfterSending: true
    })

    // Serial connection stays open after reset, webrepl closes
    if (this.isSerialDevice()) {
      await delayMillis(1000)
      await this.exitRawRepl()
    }
  }
}

export interface ListFilesOptions {
  recursive?: boolean
}

export interface RunScriptOptions {
  disableDedent?: boolean
  exitRawRepl?: boolean
  broadcastOutputAsTerminalData?: boolean  // typically output is collected and returned, but it can also be broadcast as terminal data as it is received, char by char
  exitAfterSending?: boolean
}

export interface ResetOptions {
  softReset?: boolean
  broadcastOutputAsTerminalData?: boolean
}
