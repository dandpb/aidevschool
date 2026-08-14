/**
 * Shared honest console logger for curriculum node-impls (import via relative path).
 * ponytail: not a pino shim — silent for tests, JSON lines otherwise.
 */
export type Logger = {
  info: (obj?: unknown, msg?: string) => void
  error: (obj?: unknown, msg?: string) => void
  warn: (obj?: unknown, msg?: string) => void
  debug: (obj?: unknown, msg?: string) => void
  fatal: (obj?: unknown, msg?: string) => void
  child: (bindings?: Readonly<Record<string, unknown>>) => Logger
}

function emit(
  level: string,
  silent: boolean,
  bindings: Readonly<Record<string, unknown>>,
  obj?: unknown,
  msg?: string,
): void {
  if (silent) return
  if (typeof obj === "string" && msg === undefined) {
    console.log(JSON.stringify({ level, msg: obj, time: new Date().toISOString(), ...bindings }))
    return
  }
  const fields = obj !== null && typeof obj === "object" && !Array.isArray(obj) ? obj : { value: obj }
  console.log(JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields, ...bindings }))
}

function createBoundLogger(
  silent: boolean,
  bindings: Readonly<Record<string, unknown>>,
): Logger {
  const logger: Logger = {
    info: (o, m) => emit("info", silent, bindings, o, m),
    error: (o, m) => emit("error", silent, bindings, o, m),
    warn: (o, m) => emit("warn", silent, bindings, o, m),
    debug: (o, m) => emit("debug", silent, bindings, o, m),
    fatal: (o, m) => emit("fatal", silent, bindings, o, m),
    child: (childBindings = {}) => createBoundLogger(silent, { ...bindings, ...childBindings }),
  }
  return logger
}

export function createLogger(level = "info"): Logger {
  return createBoundLogger(level === "silent" || level === "off", {})
}
