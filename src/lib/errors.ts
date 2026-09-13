interface ErrorLike {
  message?: unknown;
  hint?: unknown;
}

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null;
}

/**
 * Extracts a human-readable message from a caught error. Needed because
 * supabase-js's `{ data, error }` results (the default, non-throwing path)
 * return `error` as a plain `{ message, details, hint, code }` object from
 * `JSON.parse` — not an `Error` instance — so `err instanceof Error` is
 * false for them even though `err.message` is set. Auth errors (from
 * `supabase.auth.*`) ARE real `Error` instances and also have `.message`,
 * so this covers both cases the same way.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (isErrorLike(err) && typeof err.message === 'string' && err.message) {
    // Postgres RAISE EXCEPTION messages can carry a useful `hint` too.
    if (typeof err.hint === 'string' && err.hint) {
      return `${err.message} (${err.hint})`;
    }
    return err.message;
  }
  return fallback;
}
