/**
 * raw mode notes:
 * - starts with '>'. has no echo. input needs to be finished with ctrl+d (\x04)
 * - output has to start with 'OK', then the actual output, then \x04 then error output then again \x04
 * - finally starts over with '>'
 */
import WebSocket from 'ws'
import { InvalidPassword, CouldNotConnect, ScriptExecutionError } from './errors'
import { debug, dedent } from './utils';
export { InvalidPassword, CouldNotConnect, ScriptExecutionError }
import { performance } from 'perf_hooks'

const delayMillis = (delayMs: number) => new Promise(resolve => setTimeout(resolve, delayMs));

export enum WebReplState {
  CONNECTING = 'CONNECTING',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum WebReplMode {
  TERMINAL = 'TERMINAL',
  SCRIPT_RAW_MODE = 'SCRIPT_RAW_MODE',  // when raw mode is active

  WAITING_RESPONSE_GETVER = 'WAITING_RESPONSE_GETVER',
}

export enum RawReplState {
  // DISABLED = 'DISABLED',
  ENTERING = 'ENTERING',
  ENTERING_WAITING_FOR_START = 'ENTERING_WAITING_FOR_START',
  WAITING_FOR_INPUT = 'WAITING_FOR_INPUT',
  SCRIPT_SENT = 'SCRIPT_SENT',
  SCRIPT_RECEIVING_OUTPUT = 'SCRIPT_RECEIVING_OUTPUT',
  SCRIPT_RECEIVING_ERROR = 'SCRIPT_RECEIVING_ERROR',
  SCRIPT_WAITING_FOR_END = 'SCRIPT_WAITING_FOR_END',
  CHANGING_TO_FRIENDLY_REPL = 'CHANGING_TO_FRIENDLY_REPL',
}

export interface WebReplOptions {
  attachStateToWindow: boolean | Window
}

type promiseResolve = (value: string | PromiseLike<string>) => void;
type promiseReject = (reason: any) => void;

export interface IWebReplState {
  ws: WebSocket | null
  replState: WebReplState
  replMode: WebReplMode // only if replState is connected
  replPassword: string

  // promise helpers for user script
  replPromise: Promise<string> | null;  // helper to await command executions
  replPromiseResolve: promiseResolve | null
  replPromiseReject: promiseReject | null

  // promise helpers for switching between RAW and normal terminal mode
  // replModeSwitchPromise: Promise<string> | null;
  // replModeSwitchPromiseResolve: promiseResolve | null
  // replModeSwitchPromiseReject: promiseReject | null
  // replModeSwitchLastInput: string
  rawReplState: RawReplState

  lastCommand: string
  inputBuffer: string
  errorBuffer: string

  lastRunScriptTimeNeeded: number
}

export interface WindowWithWebRepl extends Window {
  [x: string]: any;
  testWindow: any;
  webReplState: IWebReplState | undefined
}

declare const window: WindowWithWebRepl;

export class WebREPL {
  onclose: () => void
  onTerminalData: (data: string) => void
  state: IWebReplState

  private getInitState(): IWebReplState {
    return {
      ws: null,
      replState: WebReplState.CLOSED,
      replMode: WebReplMode.TERMINAL,
      inputBuffer: '',
      errorBuffer: '',
      replPassword: '',
      lastCommand: '',

      replPromise: null,
      replPromiseResolve: null,
      replPromiseReject: null,

      // replModeSwitchPromise: null,
      // replModeSwitchPromiseResolve: null,
      // replModeSwitchPromiseReject: null,
      // replModeSwitchLastInput: '',
      rawReplState: RawReplState.WAITING_FOR_INPUT,
      lastRunScriptTimeNeeded: -1
    }
  }

  constructor(options?: WebReplOptions) {
    // State init, either local only or also on a window instance (for code hot reloading)
    if (options?.attachStateToWindow) {
      this.attachStateToWindow(options.attachStateToWindow)
    } else {
      // Normal local state init
      this.state = this.getInitState()
    }
  }

  /**
   * attachStateToWindow is a dev helper to allow code hot reloading (reusing a websocket/webrepl instance across code reloads)
   */
  private attachStateToWindow(targetWindow: Window | boolean) {
    // console.log('attachStateToWindow', targetWindow)

    const getTargetWindow = () => {
      if (typeof targetWindow === 'boolean') {
        // console.log('attach state to the default window')
        if (typeof window === 'undefined') {
          throw new Error('Cannot attach state to window because window is undefined')
        }
        return window
      } else {
        // console.log('attach state to an existing window')
        return targetWindow
      }
    }

    const _targetWindow = getTargetWindow() as WindowWithWebRepl

    if (_targetWindow.webReplState && _targetWindow.webReplState.ws) {
      // console.log('hot reloading state from window')
      this.state = _targetWindow.webReplState
    } else {
      // console.log('initial state creation')
      _targetWindow.webReplState = this.state = this.getInitState()
    }
  }

  public async connect(host: string, password?: string) {
    // console.log(`connect: host=${host}, password=${password}`)
    if (!password) {
      throw new Error('Password is required for webrepl (over network). Serial interface is TODO.')
    }

    // check if already a websocket connection active
    if (this.state.ws && this.state.ws.readyState !== WebSocket.CLOSED) {  // see also https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
      console.warn("webrepl: Cannot connect, already active ws connection", this.state.ws)
      return
    }

    const uri = `ws://${host}:8266`
    // console.log('connect', uri)
    this.state.replState = WebReplState.CONNECTING
    this.state.replPassword = password

    this.state.ws = new WebSocket(uri)
    this.state.ws.binaryType = 'arraybuffer'

    // this.state.ws.onopen = () => console.log(`WebSocket connected`)
    this.state.ws.onmessage = (event) => this.onWebsocketMessage(event)
    this.state.ws.onerror = (err) => {
      // console.log(`WebSocket onerror`, err)
      const e = this.state.replState === WebReplState.CONNECTING ? new CouldNotConnect(err.message) : err
      if (this.state.replPromiseReject) this.state.replPromiseReject(e)
    }

    this.state.ws.onclose = () => {
      // console.log(`WebSocket onclose`)
      this.state.replState = WebReplState.CLOSED
      if (this.state.replPromiseResolve) this.state.replPromiseResolve('') // release the 'close' async event
      if (this.onclose) this.onclose()
    }

    // create and return a new promise, which is fulfilled only after connecting to repl
    return this.createReplPromise()
  }

  private createReplPromise(): Promise<string> {
    this.state.replPromise = new Promise((resolve, reject) => {
      this.state.replPromiseResolve = resolve
      this.state.replPromiseReject = reject
    })
    return this.state.replPromise
  }

  private onWebsocketMessage(event: WebSocket.MessageEvent) {
    const data = event.data.toString()
    const dataTrimmed = data.trim()

    // do nothing if special final bytes on closing a ws connection
    if (this.state.ws!.readyState === WebSocket.CLOSING && data.length === 2 && data.charCodeAt(0) === 65533 && data.charCodeAt(1) === 0) return

    // console.log(`onWebsocketMessage:${event.data instanceof ArrayBuffer ? ' [ArrayBuffer]' : ''}${data.endsWith('\n') ? ' [End:\\n]' : ''}${data.length < 3 ? ' [char0:' + data.charCodeAt(0) + ']'  : ''}`, data.length, data)

    /**
     * CONNECTING
     */
    if (this.state.replState === WebReplState.CONNECTING) {
      if (dataTrimmed === 'Password:') {
        this.state.ws!.send(this.state.replPassword + '\r')
        return

      } else if (dataTrimmed === 'Access denied') {
        this.state.ws!.close()  // just to be sure. micropy already closes the connection
        if (this.state.replPromiseReject) this.state.replPromiseReject(new InvalidPassword('REPL password invalid'))
        return

      } else if (dataTrimmed.startsWith('WebREPL connected')) {
        this.state.replState = WebReplState.OPEN
        this.state.replMode = WebReplMode.TERMINAL
        this.state.inputBuffer = ''
        if (this.state.replPromiseResolve) this.state.replPromiseResolve('')
        return
      }
    }

    /**
     * FRIENDLY MODE REPL / TERMINAL MODE
     */
    if (this.state.replMode === WebReplMode.TERMINAL) {
      // handle terminal message
      // console.log('term:', data, data.length)
      if (this.onTerminalData) this.onTerminalData(data)
      return
    }

    /**
     * RAW MODE REPL
     */
    if (this.state.replMode === WebReplMode.SCRIPT_RAW_MODE) {
      // console.log(`raw_mode: '${data}'`, data.length, data.length > 0 ? data.charCodeAt(0) : '')

      if (this.state.rawReplState === RawReplState.ENTERING) {
        const waitFor1 = `raw REPL; CTRL-B to exit\r\n`
        if (data === waitFor1) this.state.rawReplState = RawReplState.ENTERING_WAITING_FOR_START

      } else if (this.state.rawReplState === RawReplState.ENTERING_WAITING_FOR_START) {
        if (data === '>') {
          // console.log('_raw mode start', !!this.state.replModeSwitchPromiseResolve)
          this.state.replMode = WebReplMode.SCRIPT_RAW_MODE
          if (this.state.replPromiseResolve) this.state.replPromiseResolve('')
        }

      } else if (this.state.rawReplState === RawReplState.SCRIPT_SENT) {
        if (data === 'OK') {
          // console.log('ok received, collecting input')
          this.state.inputBuffer = ''
          this.state.errorBuffer = ''
          this.state.rawReplState = RawReplState.SCRIPT_RECEIVING_OUTPUT
          // this.state.rawReplExitStep = 0
        } else {
          console.error('error: should have received OK, received:', data)
        }

      } else if (this.state.rawReplState === RawReplState.SCRIPT_RECEIVING_OUTPUT) {
        if (data === '\x04') {
          // End of output. now switch to receiving error
          this.state.rawReplState = RawReplState.SCRIPT_RECEIVING_ERROR
        } else {
          this.state.inputBuffer += data
        }

      } else if (this.state.rawReplState === RawReplState.SCRIPT_RECEIVING_ERROR) {
        if (data === '\x04') {
          // End of error. now wait for new start
          this.state.rawReplState = RawReplState.SCRIPT_WAITING_FOR_END
        } else {
          this.state.errorBuffer += data
        }

      } else if (this.state.rawReplState === RawReplState.SCRIPT_WAITING_FOR_END) {
        if (data === '>') {
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
          console.error('waiting for end, received unexpected data:', data)
        }

      } else if (this.state.rawReplState === RawReplState.CHANGING_TO_FRIENDLY_REPL) {
        if (dataTrimmed === '>>>') {
          // console.log('__ back in friendly repl mode')
          if (this.state.replPromiseResolve) this.state.replPromiseResolve('')
        }
      }
    }


    // // Special handler for executing REPL commands: collect buffer and detect end
    // if (dataTrimmed === '>>>') {
    //   // console.log('end of data,', this.state.inputBuffer)
    //   let response = this.state.inputBuffer
    //   this.state.inputBuffer = ''
    //   this.state.replMode = WebReplMode.TERMINAL

    //   // Sanitize output (strip command):
    //   if (response.startsWith(this.state.lastCommand)) {
    //     response = response.replace(this.state.lastCommand, '')
    //   }
    //   response = response.trim()
    //   if (this.state.replPromiseResolve) this.state.replPromiseResolve(response)
    // } else {
    //   this.state.inputBuffer += event.data.toString()
    // }
  }

  isConnected() {
    return this.state.replState === WebReplState.OPEN
  }

  // async runReplCommand(command: string) {
  //   if (!this.state.ws || this.state.ws.readyState !== WebSocket.OPEN) {
  //     throw new Error('runReplCommand: No open websocket')
  //   }

  //   // Prepare command
  //   let sanitizedCommand = command.replace(/\n/g, "\r")
  //   if (!sanitizedCommand.endsWith('\r')) { sanitizedCommand += '\r' }

  //   // Update state
  //   this.state.lastCommand = command
  //   this.state.inputBuffer = ''
  //   this.state.replMode = WebReplMode.WAITING_RESPONSE_COMMAND

  //   // Send command and return promise
  //   const promise = this.createReplPromise()
  //   this.state.ws.send(sanitizedCommand)
  //   return promise
  // }

  wsSendData(data: string | ArrayBuffer) {
    if (!this.state.ws || this.state.ws.readyState !== WebSocket.OPEN) {
      throw new Error('wsSendData: No open websocket')
    }
    // console.log('wsSendData', data)
    this.state.ws.send(data)
  }

  public async close() {
    if (this.state.ws && this.state.ws.readyState === WebSocket.OPEN) {
      // console.log('closing')
      this.state.ws.close()
      this.state.replState = WebReplState.CLOSED
      return this.createReplPromise()
    } else {
      console.log('wanting to close already closed websocket')
      return true
    }
  }

  // public async listFiles(): Promise<string[]> {
  //   const output = await this.runReplCommand('import os; os.listdir()')
  //   return JSON.parse(output.replace(/'/g, '"'))
  // }

  public async runScript(script: string, disableDedent = false) {
    // console.log('runScript', script)

    await this.enterRawRepl()
    // console.log('runScript: raw mode entered')

    // Prepare script for execution (dedent by default)
    if (!disableDedent) script = dedent(script)

    // Send data to raw repl. Note: cannot send too much data at once over the
    // network, else the webrepl can't parse it quick enough and returns an error.
    // Therefore we chunk the data and add a send delay.
    // 120b and 180ms delay seems to work well for all ESP32 devices.
    const chunkSize = 120;  // how many bytes to send per chunk.
    const chunkDelayMillis = 200;  // fixed delay. a progressive delay doesn't seem to help
    debug(`runScript: ${script.length} bytes -> ${Math.ceil(script.length / chunkSize)} chunks`)

    while (script.length) {
      const chunk = script.substring(0, chunkSize)
      script = script.substr(chunkSize)
      this.wsSendData(chunk)
      await delayMillis(chunkDelayMillis)
    }

    debug('runScript: script sent')
    const millisStart = performance.now()

    // Update state and create a new promise that will be fulfilled when script has run
    this.state.rawReplState = RawReplState.SCRIPT_SENT
    const promise = this.createReplPromise()

    // Send ctrl+D to execute the uploaded script in the raw repl
    this.wsSendData('\x04')
    // console.log('runScript: script sent, waiting for response')

    // wait for script execution
    const scriptOutput = await promise
    const millisRuntime = Math.round(performance.now() - millisStart)
    debug(`runScript: script done (${millisRuntime / 1000}sec)`)
    this.state.lastRunScriptTimeNeeded = millisRuntime

    // Exit raw repl mode, re-enter friendly repl
    await this.exitRawRepl()
    // console.log('runScript: exited RAW repl')

    return scriptOutput
  }

  private async enterRawRepl() {
    // see also https://github.com/scientifichackers/ampy/blob/master/ampy/pyboard.py#L175
    // Prepare state for mode switch
    this.state.replMode = WebReplMode.SCRIPT_RAW_MODE
    this.state.rawReplState = RawReplState.ENTERING

    const promise = this.createReplPromise()

    // Send ctrl-C twice to interrupt any running program
    this.wsSendData('\r\x03')
    await delayMillis(100) // wait 0.1sec
    this.wsSendData('\x03')
    await delayMillis(100) // wait 0.1sec
    this.wsSendData('\x01')  // ctrl+A
    await delayMillis(100) // wait 0.1sec

    return promise
  }

  private async exitRawRepl() {
    this.state.rawReplState = RawReplState.CHANGING_TO_FRIENDLY_REPL
    const promise = this.createReplPromise()
    this.wsSendData('\r\x02')
    return promise
  }
}
