// tslint:disable: max-classes-per-file
export class InvalidPassword extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidPassword.prototype);
  }
}

export class CouldNotConnect extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CouldNotConnect.prototype);
  }
}

export class ScriptExecutionError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ScriptExecutionError.prototype);
  }
}
