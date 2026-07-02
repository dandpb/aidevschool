const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

/**
 * Escape a value for safe interpolation into an HTML template string.
 * The render layer assigns its output to `innerHTML`, so every dynamic
 * text field must pass through here (see TECH_DEBT_AUDIT_2026-06-28.md, D7).
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch)
}
