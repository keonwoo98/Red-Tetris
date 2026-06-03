// The single permitted use of `this` on the client: a custom Error subclass (spec exception).
export class JoinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JoinError';
  }
}
