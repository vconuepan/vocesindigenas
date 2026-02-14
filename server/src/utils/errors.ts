/** Produce a short, human-readable error summary without serializing bulky internals. */
export function summarizeError(err: unknown): string {
  if (err instanceof Error && 'isAxiosError' in err) {
    const axiosErr = err as { response?: { status?: number }; code?: string; message: string }
    if (axiosErr.response?.status) return `HTTP ${axiosErr.response.status}`
    if (axiosErr.code) return axiosErr.code
    return axiosErr.message
  }
  return err instanceof Error ? err.message : String(err)
}
