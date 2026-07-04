/** Augments Express's Request with the authenticated user id set by the auth middleware. */
declare namespace Express {
  interface Request {
    userId?: string;
  }
}
