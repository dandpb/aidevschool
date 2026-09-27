const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}
const HTML_SPECIAL_CHARS = /[&<>"']/
const HTML_SPECIAL_CHARS_GLOBAL = /[&<>"']/g

/** Escapes a value for safe interpolation into innerHTML (XSS hardening, AID-3049 / PR #581 pattern). */
export function escapeHtml(value: unknown): string {
  const str = String(value ?? "")
  if (!HTML_SPECIAL_CHARS.test(str)) return str
  return str.replace(HTML_SPECIAL_CHARS_GLOBAL, (ch) => HTML_ESCAPES[ch] ?? ch)
}
