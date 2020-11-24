import { assert } from "console";
import { InvalidPassword } from './errors'
import { WebREPL, WindowWithWebRepl, WebReplState } from "./main";

test('throws correct errors ', () => {
  class BarError extends Error {
    constructor(m: string) {
        super(m);
        Object.setPrototypeOf(this, BarError.prototype);
    }
  }

  const t = () => {
    throw new InvalidPassword('xxx')
  }
  expect(t).toThrow(Error);
  expect(t).toThrow(InvalidPassword);
  expect(t).not.toThrow(BarError);
});

test('attaching state to window for code hot reloading', () => {
  // tslint:disable-next-line: no-object-literal-type-assertion
  const testWindow: WindowWithWebRepl = {} as WindowWithWebRepl

  const webrepl = new WebREPL({ attachStateToWindow: testWindow })

  // Check initial state of window
  expect(testWindow.webReplState).toBeTruthy();
  expect(testWindow.webReplState!.replState).toEqual(WebReplState.CLOSED)

  // Updating webrepl state should also update window state
  webrepl.state.replState = WebReplState.OPEN
  expect(testWindow.webReplState!.replState).toEqual(WebReplState.OPEN)

  // test code hot reloading: if state exists on window, it should reuse that
  // tslint:disable-next-line: no-object-literal-type-assertion
  testWindow.webReplState!.ws = {} as WebSocket
  const webrepl2 = new WebREPL({ attachStateToWindow: testWindow })
  expect(webrepl2.state.replState).toEqual(WebReplState.OPEN)

  webrepl2.state.replState = WebReplState.ASKING_FOR_PASSWORD
  expect(testWindow.webReplState!.replState).toEqual(WebReplState.ASKING_FOR_PASSWORD)
  expect(webrepl.state.replState).toEqual(WebReplState.ASKING_FOR_PASSWORD)

  webrepl.state.replState = WebReplState.CONNECTING
  expect(testWindow.webReplState!.replState).toEqual(WebReplState.CONNECTING)
  expect(webrepl2.state.replState).toEqual(WebReplState.CONNECTING)
})
