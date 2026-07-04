/**
 * Securely escapes HTML entities to prevent Cross-Site Scripting (XSS).
 *
 * @param unsafe - The untrusted string to sanitize.
 * @returns The sanitized string safe for innerHTML interpolation.
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== "string") {
    return unsafe
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
