const LOCAL_OS_URL = "http://127.0.0.1:5174"

export function resolveCodexDojoOsUrl(candidate: string | undefined): string | undefined {
  const value = candidate?.trim()
  if (!value) return undefined
  if (value.startsWith("/") && !value.startsWith("//")) return value

  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? value : undefined
  } catch {
    return undefined
  }
}

export function getCodexDojoOsUrl(): string | undefined {
  const configuredUrl = import.meta.env.VITE_CODEXDOJO_OS_URL
  const candidate = configuredUrl ?? (import.meta.env.DEV ? LOCAL_OS_URL : undefined)
  return resolveCodexDojoOsUrl(candidate)
}
