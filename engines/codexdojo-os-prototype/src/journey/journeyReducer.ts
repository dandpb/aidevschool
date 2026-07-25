import type { JourneyRoute } from '../app/routes'
import type { OsProgress } from '../progress/domain'

export type JourneyState =
  | { readonly kind: 'booting'; readonly route: JourneyRoute }
  | {
      readonly kind: 'ready'
      readonly route: JourneyRoute
      readonly progress: OsProgress
      readonly resetReason?: string
    }
  | { readonly kind: 'failed'; readonly route: JourneyRoute; readonly message: string }

export type JourneyAction =
  | {
      readonly type: 'LOADED'
      readonly route: JourneyRoute
      readonly progress: OsProgress
      readonly resetReason?: string
    }
  | { readonly type: 'ROUTE_CHANGED'; readonly route: JourneyRoute }
  | { readonly type: 'PROGRESS_SAVED'; readonly progress: OsProgress }
  | { readonly type: 'FAILED'; readonly message: string }

export function journeyReducer(state: JourneyState, action: JourneyAction): JourneyState {
  switch (action.type) {
    case 'LOADED':
      return {
        kind: 'ready',
        route: action.route,
        progress: action.progress,
        ...(action.resetReason === undefined ? {} : { resetReason: action.resetReason }),
      }
    case 'ROUTE_CHANGED':
      return { ...state, route: action.route }
    case 'PROGRESS_SAVED':
      return state.kind === 'ready' ? { ...state, progress: action.progress } : state
    case 'FAILED':
      return { kind: 'failed', route: state.route, message: action.message }
  }
}
