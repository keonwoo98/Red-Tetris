/** Thrown when a piece is requested before the game has a seed. The one place `this` is used
 *  inside an Error subclass on the server (OOP server allows `this` everywhere anyway). */
export class GameNotStartedError extends Error {
  constructor(room: string) {
    super(`Game "${room}" not started; seed is null.`);
    this.name = 'GameNotStartedError';
  }
}
