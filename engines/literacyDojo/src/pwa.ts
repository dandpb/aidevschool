export function serviceWorkerUrl(baseUrl: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}sw.js`;
}
