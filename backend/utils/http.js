// Small helpers shared by controllers and services.

// Create an Error that carries an HTTP status code.
// Throwing it inside a route sends `{ message }` with that status (see server.js).
export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Escape user text so it can be used safely inside a RegExp.
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
