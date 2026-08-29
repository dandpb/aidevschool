const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

// Hoisted so neither regex is allocated per call. The test regex must stay
// non-global: a shared global regex would carry stateful lastIndex bugs.
const HTML_SPECIAL_CHARS = /[&<>"']/
const HTML_SPECIAL_CHARS_GLOBAL = /[&<>"']/g

/**
 * Escape a value for safe interpolation into an HTML template string.
 * The render layer assigns its output to `innerHTML`, so every dynamic
 * text field must pass through here (see TECH_DEBT_AUDIT_2026-06-28.md, D7).
 */
export function escapeHtml(value: unknown): string {
  const str = String(value ?? "")
  if (!HTML_SPECIAL_CHARS.test(str)) {
    return str
  }

  return str.replace(HTML_SPECIAL_CHARS_GLOBAL, (ch) => HTML_ESCAPES[ch] ?? ch)
}
