const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Hoisted so neither regex is allocated per call. The test regex must stay
// non-global: a shared global regex would carry stateful lastIndex bugs.
const HTML_SPECIAL_CHARS = /[&<>"']/;
const HTML_SPECIAL_CHARS_GLOBAL = /[&<>"']/g;

/**
 * Escapa texto para interpolação segura em templates que terminam em
 * `innerHTML`. O read model é gerado localmente, mas a superfície é
 * vanilla-JS string-templated: escapes aqui são defesa em profundidade.
 *
 * ⚡ Bolt: Fast-path optimization with .test() to avoid memory allocation and GC
 * overhead for strings that don't need escaping.
 */
export function escapeHtml(value: unknown): string {
  const str = String(value ?? "");
  if (!HTML_SPECIAL_CHARS.test(str)) {
    return str;
  }
  return str.replace(HTML_SPECIAL_CHARS_GLOBAL, (ch) => HTML_ESCAPES[ch] ?? ch);
}
