/** Operator desktop: full Engine Hub including labs and miniTown. Public Hub uses an allowlist. */
export function isOperatorSurface(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('operator') === '1') return true
  if (params.get('operator') === '0') return false
  return import.meta.env.DEV
}
