
export interface WebReplOptions {
  attachStateTo?: any
}

export class WebREPL {
  ws: WebSocket | null

  constructor(options?: WebReplOptions) {
    // dev helper to store state outside of this code.
    // this allows to hot code reload an open websocket/repl session
    const stateTarget: WebREPL = options?.attachStateTo || this
  }
}


// export function testError() {
//   throw new FooError('xxx')
// }
