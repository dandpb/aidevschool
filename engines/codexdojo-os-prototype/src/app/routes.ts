import type { MissionId, TrackId } from '../domain'

export type OnboardingStep = 'profile' | 'recommendation'

export type JourneyRoute =
  | { readonly kind: 'boot' }
  | { readonly kind: 'onboarding'; readonly step: OnboardingStep }
  | { readonly kind: 'hub' }
  | { readonly kind: 'mission'; readonly trackId: TrackId; readonly missionId: MissionId }
  | { readonly kind: 'map'; readonly trackId?: TrackId }
  | { readonly kind: 'progress' }
  | { readonly kind: 'desktop' }
  | { readonly kind: 'not-found'; readonly requestedPath: string }

export type OsPath =
  | '/'
  | '/onboarding'
  | '/onboarding/recommendation'
  | '/hub'
  | '/map'
  | '/progress'
  | '/desktop'
  | `/mission/${TrackId}/${string}`

export interface NavigationPort {
  currentPath(): string
  push(path: OsPath): void
  replace(path: OsPath): void
  subscribe(listener: (path: string) => void): () => void
}

export function parseRoute(pathname: string): JourneyRoute {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { kind: 'boot' }
  if (path === '/onboarding') return { kind: 'onboarding', step: 'profile' }
  if (path === '/onboarding/recommendation') {
    return { kind: 'onboarding', step: 'recommendation' }
  }
  if (path === '/hub') return { kind: 'hub' }
  if (path === '/map') return { kind: 'map' }
  if (path === '/progress') return { kind: 'progress' }
  if (path === '/desktop') return { kind: 'desktop' }
  const mission = path.match(/^\/mission\/(ai-pratica|dev)\/([^/]+)$/)
  if (mission?.[1] !== undefined && mission[2] !== undefined) {
    return {
      kind: 'mission',
      trackId: mission[1] as TrackId,
      missionId: decodeURIComponent(mission[2]),
    }
  }
  return { kind: 'not-found', requestedPath: pathname }
}

export function encodeRoute(route: Exclude<JourneyRoute, { kind: 'not-found' }>): OsPath {
  switch (route.kind) {
    case 'boot':
      return '/'
    case 'onboarding':
      return route.step === 'profile' ? '/onboarding' : '/onboarding/recommendation'
    case 'hub':
      return '/hub'
    case 'mission':
      return `/mission/${route.trackId}/${encodeURIComponent(route.missionId)}`
    case 'map':
      return '/map'
    case 'progress':
      return '/progress'
    case 'desktop':
      return '/desktop'
  }
}

export class BrowserNavigation implements NavigationPort {
  currentPath(): string {
    return window.location.pathname
  }

  push(path: OsPath): void {
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  replace(path: OsPath): void {
    window.history.replaceState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  subscribe(listener: (path: string) => void): () => void {
    const onPopState = () => listener(this.currentPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }
}
