export type DevInstrumentationEnvironment = {
  readonly DEV: boolean
  readonly VITE_ENABLE_REACT_INSTRUMENTATION?: string
}

export function shouldEnableReactInstrumentation(environment: DevInstrumentationEnvironment): boolean {
  return environment.DEV && environment.VITE_ENABLE_REACT_INSTRUMENTATION === '1'
}

