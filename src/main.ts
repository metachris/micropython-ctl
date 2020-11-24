import { InvalidPassword } from './errors'

export interface WebReplOptions {
  attachStateToWindow: boolean
}

export class WebREPL {
  stateTarget: WebREPL | Window
  ws: WebSocket | null

  constructor(options?: WebReplOptions) {
    // dev helper to store state outside of this code.
    // this allows to hot code reload an open websocket/repl session
    const stateTarget = options?.attachStateToWindow ? window : this
  }

  public connect(host, password) {
    console.log(`connect: host=${host}, password=${password}`)
  }
}


// export function testError() {
//   throw new FooError('xxx')
// }
