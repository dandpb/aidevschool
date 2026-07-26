/**
 * Same-origin guard for configured endpoints. Both the analytics transport and
 * the mentor provider take a URL from build-time config and POST learner data to
 * it, so the check that it cannot leave this origin lives in one place.
 */
export function sameOriginPath(endpoint: string, error: string): string {
  const resolved = new URL(endpoint, window.location.origin)
  if (resolved.origin !== window.location.origin) throw new Error(error)
  return `${resolved.pathname}${resolved.search}`
}
