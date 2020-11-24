export class InvalidPassword extends Error {
  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, InvalidPassword.prototype);
  }
}
