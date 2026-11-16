/**
 * The readable message from a thrown value. Supabase returns its errors as plain
 * objects ({ message, code, details }), not `Error` instances, so the usual
 * `err instanceof Error ? err.message : fallback` throws the real reason away.
 */
export function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string' && (err as { message: string }).message) {
    return (err as { message: string }).message
  }
  return fallback
}
