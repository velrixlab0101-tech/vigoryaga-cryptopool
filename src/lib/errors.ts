/** Extracts a human-readable message from an unknown thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error && typeof error === 'object') {
    const candidate = error as { shortMessage?: unknown; message?: unknown }
    if (typeof candidate.shortMessage === 'string' && candidate.shortMessage) {
      return candidate.shortMessage
    }
    if (typeof candidate.message === 'string' && candidate.message) {
      return candidate.message
    }
  }
  if (typeof error === 'string' && error) return error
  return fallback
}
