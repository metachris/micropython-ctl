import { InvalidPassword } from './errors'

export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
}

export enum WebReplState {
  CONNECTING = 'CONNECTING',
  ASKING_FOR_PASSWORD = 'ASKING_FOR_PASSWORD',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
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
  wsState: WebSocketState
  replState: WebReplState
  replMode: WebReplMode // only if replState is connected
}

export interface WindowWithWebRepl extends Window {
  webReplState: IWebReplState | undefined
}

declare const window: WindowWithWebRepl;

export class WebREPL {
  options: WebReplOptions | null
  state: IWebReplState

  getInitState(): IWebReplState {
    return {
      ws: null,
      wsState: WebSocketState.CLOSED,
      replState: WebReplState.CLOSED,
      replMode: WebReplMode.TERMINAL
    }
  }

  constructor(options?: WebReplOptions) {
    this.options = options || null

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
  }
}
