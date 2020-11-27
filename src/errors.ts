// tslint:disable: max-classes-per-file
export class InvalidPassword extends Error {
  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, InvalidPassword.prototype);
  }
}

export class CouldNotConnect extends Error {
  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, CouldNotConnect.prototype);
  }
}

export class ScriptExecutionError extends Error {
  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, ScriptExecutionError.prototype);
  }
}
