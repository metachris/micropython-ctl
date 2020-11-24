import { assert } from "console";
import { InvalidPassword } from './errors'

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
