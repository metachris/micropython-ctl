import { InvalidPassword } from './errors'

export interface WebReplOptions {
  attachStateToWindow: boolean
}

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

interface IWebReplState {
  ws: WebSocket
  wsState: WebSocketState
  replState: WebReplState
  replMode: WebReplMode // only if replState is connected
}

interface WindowWithWebRepl extends Window {
  webReplState: IWebReplState | undefined
}

declare const window: WindowWithWebRepl;

export class WebREPL {
  options: WebReplOptions | null
  state: IWebReplState

  constructor(options?: WebReplOptions) {
    this.options = options || null

    if (options?.attachStateToWindow) {
      // allow connection reuse in case of a hot reload
      if (typeof window === 'undefined') {
        throw new Error('Cannot attach state to window because window is undefined')
      }

      // now we have a window instance for sure
      if (window.webReplState) {
        // hot reload
        this.state = window.webReplState
        console.log('hot reloaded window state', this.state)
      } else {
        // first init
        window.webReplState = this.state
        console.log('initialized window state', this.state)
      }
    }
  }

  public async connect(host, password) {
    console.log(`connect: host=${host}, password=${password}`)
  }
}


// export function testError() {
//   throw new FooError('xxx')
// }
