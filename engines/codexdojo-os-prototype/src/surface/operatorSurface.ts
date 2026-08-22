/** Operator desktop: full Engine Hub, Central de Apps, and laboratorio catalog. */
export function isOperatorSurface(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('operator') === '1') return true
  if (params.get('operator') === '0') return false
  return import.meta.env.DEV
}
