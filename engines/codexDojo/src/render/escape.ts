const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

const matchHtmlRegExp = /[&<>"']/

/**
 * Escape a value for safe interpolation into an HTML template string.
 * The render layer assigns its output to `innerHTML`, so every dynamic
 * text field must pass through here (see TECH_DEBT_AUDIT_2026-06-28.md, D7).
 */
export function escapeHtml(value: unknown): string {
  // ⚡ Bolt: Fast path for strings that do not contain HTML characters.
  // RegExp.test() without memory allocation is ~2x faster than .replace() that doesn't match.
  const str = String(value ?? "")
  if (!matchHtmlRegExp.test(str)) {
    return str
  }

  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch)
}
