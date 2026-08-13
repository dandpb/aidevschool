export type RendererPreference = 'auto' | 'webgl' | 'accessible'
export type ActiveRenderer = 'webgl' | 'canvas2d' | 'dom' | 'none'
export type RendererStatus = 'probing' | 'initializing' | 'ready' | 'degraded' | 'failed'
export type RendererFailureReason =
  | 'unsupported'
  | 'creation-failed'
  | 'context-lost'
  | 'restore-failed'
  | 'load-timeout'

export type RendererState = {
  readonly requested: RendererPreference
  readonly active: ActiveRenderer
  readonly status: RendererStatus
  readonly reason?: RendererFailureReason
  readonly retryCount: number
}

export type RendererAction =
  | { readonly type: 'PROBE_STARTED'; readonly requested: RendererPreference }
  | { readonly type: 'INITIALIZATION_STARTED'; readonly renderer: ActiveRenderer }
  | { readonly type: 'RENDERER_READY'; readonly renderer: Exclude<ActiveRenderer, 'none'> }
  | {
      readonly type: 'RENDERER_DEGRADED'
      readonly renderer: 'canvas2d' | 'dom'
      readonly reason: RendererFailureReason
    }
  | { readonly type: 'RENDERER_FAILED'; readonly reason: RendererFailureReason }
  | { readonly type: 'CONTEXT_LOST' }
  | { readonly type: 'RETRY_REQUESTED'; readonly requested?: RendererPreference }

export function createInitialRendererState(
  requested: RendererPreference = 'auto',
): RendererState {
  return {
    requested,
    active: 'none',
    status: 'probing',
    retryCount: 0,
  }
}

export function rendererReducer(state: RendererState, action: RendererAction): RendererState {
  switch (action.type) {
    case 'PROBE_STARTED':
      return {
        requested: action.requested,
        active: 'none',
        status: 'probing',
        retryCount: state.retryCount,
      }
    case 'INITIALIZATION_STARTED':
      return {
        requested: state.requested,
        active: action.renderer,
        status: 'initializing',
        retryCount: state.retryCount,
      }
    case 'RENDERER_READY':
      return {
        requested: state.requested,
        active: action.renderer,
        status: 'ready',
        retryCount: state.retryCount,
      }
    case 'RENDERER_DEGRADED':
      return {
        requested: state.requested,
        active: action.renderer,
        status: 'degraded',
        reason: action.reason,
        retryCount: state.retryCount,
      }
    case 'RENDERER_FAILED':
      return {
        requested: state.requested,
        active: 'none',
        status: 'failed',
        reason: action.reason,
        retryCount: state.retryCount,
      }
    case 'CONTEXT_LOST':
      if (state.active !== 'webgl') return state
      return {
        requested: state.requested,
        active: 'none',
        status: 'degraded',
        reason: 'context-lost',
        retryCount: state.retryCount,
      }
    case 'RETRY_REQUESTED':
      return {
        requested: action.requested ?? state.requested,
        active: 'none',
        status: 'probing',
        retryCount: state.retryCount + 1,
      }
  }
}
