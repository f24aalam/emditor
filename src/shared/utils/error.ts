export function extractErrorDetail(cause: unknown): string | null {
  if (typeof cause === "string" && cause.trim()) return cause.trim()
  if (cause instanceof Error && cause.message.trim()) return cause.message.trim()
  return null
}

export function formatErrorMessage(
  cause: unknown,
  action: string,
  fallbackSuffix = "",
): string {
  const detail = extractErrorDetail(cause)
  return detail ? `${action}: ${detail}` : `${action}${fallbackSuffix}`
}
