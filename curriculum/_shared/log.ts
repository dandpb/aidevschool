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
  child: () => Logger
}

function emit(level: string, silent: boolean, obj?: unknown, msg?: string): void {
  if (silent) return
  if (typeof obj === "string" && msg === undefined) {
    console.log(JSON.stringify({ level, msg: obj, time: new Date().toISOString() }))
    return
  }
  const fields = obj !== null && typeof obj === "object" && !Array.isArray(obj) ? obj : { value: obj }
  console.log(JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields }))
}

export function createLogger(level = "info"): Logger {
  const silent = level === "silent" || level === "off"
  const logger: Logger = {
    info: (o, m) => emit("info", silent, o, m),
    error: (o, m) => emit("error", silent, o, m),
    warn: (o, m) => emit("warn", silent, o, m),
    debug: (o, m) => emit("debug", silent, o, m),
    fatal: (o, m) => emit("fatal", silent, o, m),
    child: () => logger,
  }
  return logger
}
