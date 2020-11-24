import WebSocket from 'ws'
import { InvalidPassword } from './errors'
export { InvalidPassword }

export enum WebReplState {
  CONNECTING = 'CONNECTING',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum WebReplMode {
  TERMINAL = 'TERMINAL',
  WAITING_RESPONSE_COMMAND = 'WAITING_RESPONSE_COMMAND',
  WAITING_RESPONSE_GETVER = 'WAITING_RESPONSE_GETVER',
}

export interface WebReplOptions {
  attachStateToWindow: boolean | Window
}

export interface IWebReplState {
  ws: WebSocket | null
  replState: WebReplState
  replMode: WebReplMode // only if replState is connected
  replPassword: string

  replPromise: Promise<string> | null;  // helper to await command executions
  replPromiseResolve: (value: string | PromiseLike<string>) => void;
  replPromiseReject: (value: string | PromiseLike<string>) => void;

  lastCommand: string
  inputBuffer: string
}

export interface WindowWithWebRepl extends Window {
  [x: string]: any;
  testWindow: any;
  webReplState: IWebReplState | undefined
}

declare const window: WindowWithWebRepl;

export class WebREPL {
  onclose: () => void
  state: IWebReplState

  private getInitState(): IWebReplState {
    return {
      ws: null,
      replState: WebReplState.CLOSED,
      replMode: WebReplMode.TERMINAL,
      inputBuffer: '',
      replPassword: '',
      lastCommand: '',
      replPromise: null,
      // tslint:disable-next-line: no-empty
      replPromiseResolve: () => {},
      replPromiseReject: () => {}
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

  public async connect(host, password?) {
    console.log(`connect: host=${host}, password=${password}`)
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
    this.state.ws.onerror = (err) => console.log(`WebSocket error`, err)
    this.state.ws.onclose = () => {
      // console.log(`WebSocket onclose`)
      this.state.replState = WebReplState.CLOSED
      this.state.replPromiseResolve('') // release the 'close' async event
      if (this.onclose) this.onclose()
    }

    // create and return a new promise, which is fulfilled only after connecting to repl
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

    // check if needing to input password
    if (this.state.replState === WebReplState.CONNECTING) {
      if (dataTrimmed === 'Password:') {
        this.state.ws!.send(this.state.replPassword + '\r')
        return

      } else if (dataTrimmed === 'Access denied') {
        this.state.ws!.close()  // just to be sure. micropy already closes the connection
        this.state.replPromiseReject('REPL password invalid')
        return

      } else if (dataTrimmed.startsWith('WebREPL connected')) {
        this.state.replState = WebReplState.OPEN
        this.state.replMode = WebReplMode.TERMINAL
        this.state.inputBuffer = ''
        this.state.replPromiseResolve('')
        return
      }
    }

    // All messages received after here have a successful, open REPL+WS connection.
    // Handle plain terminal io
    if (this.state.replMode === WebReplMode.TERMINAL) {
      // handle terminal message
      // console.log('term:', data, data.length)
      process.stdout.write(data)
      return
    }

    // Special handler for executing REPL commands: collect buffer and detect end
    if (dataTrimmed === '>>>') {
      // console.log('end of data,', this.state.inputBuffer)
      let response = this.state.inputBuffer
      this.state.inputBuffer = ''
      this.state.replMode = WebReplMode.TERMINAL

      // Sanitize output (strip command):
      if (response.startsWith(this.state.lastCommand)) {
        response = response.replace(this.state.lastCommand, '')
      }
      response = response.trim()
      this.state.replPromiseResolve(response)
    } else {
      this.state.inputBuffer += event.data.toString()
    }
  }

  async runReplCommand(command: string) {
    if (!this.state.ws || this.state.ws.readyState !== WebSocket.OPEN) {
      throw new Error('runReplCommand: No open websocket')
    }

    // Prepare command
    let sanitizedCommand = command.replace(/\n/g, "\r")
    if (!sanitizedCommand.endsWith('\r')) { sanitizedCommand += '\r' }

    // Update state
    this.state.lastCommand = command
    this.state.inputBuffer = ''
    this.state.replMode = WebReplMode.WAITING_RESPONSE_COMMAND

    // Send command and return promise
    this.state.ws.send(sanitizedCommand)
    this.state.replPromise = new Promise((resolve) => this.state.replPromiseResolve = resolve)
    return this.state.replPromise
  }

  wsSendData(data: string | ArrayBuffer) {
    if (!this.state.ws || this.state.ws.readyState !== WebSocket.OPEN) {
      throw new Error('wsSendData: No open websocket')
    }
    // console.log('wsSendData', data)
    this.state.ws.send(data)
  }

  async close() {
    if (this.state.ws && this.state.ws.readyState === WebSocket.OPEN) {
      console.log('closing')
      this.state.ws.close()
      this.state.replState = WebReplState.CLOSED
      this.state.replPromise = new Promise((resolve) => this.state.replPromiseResolve = resolve)
      return this.state.replPromise
      } else {
      console.log('wanting to close already closed websocket')
      return true
    }
  }
}
