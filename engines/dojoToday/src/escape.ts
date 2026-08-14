const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapa texto para interpolação segura em templates que terminam em
 * `innerHTML`. O read model é gerado localmente, mas a superfície é
 * vanilla-JS string-templated: escapes aqui são defesa em profundidade.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}
