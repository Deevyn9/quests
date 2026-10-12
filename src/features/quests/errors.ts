// The server answered, and said no (an invalid or conflicting change).
// Retrying would never help, so the sync queue drops that change.
export class RejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RejectedError";
  }
}

// The session has expired. The queued changes are kept until the user signs in again.
export class NotSignedInError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "NotSignedInError";
  }
}
