/** Pair visual active class with ARIA for template-literal buttons. */

export function pressedAttrs(active: boolean): { className: string; aria: string } {
  return {
    className: active ? "is-active" : "",
    aria: active ? ' aria-pressed="true"' : ' aria-pressed="false"',
  }
}

export function currentAttrs(
  active: boolean,
  value: "page" | "step" | "true",
): { className: string; aria: string } {
  return {
    className: active ? "is-active" : "",
    aria: active ? ` aria-current="${value}"` : "",
  }
}
