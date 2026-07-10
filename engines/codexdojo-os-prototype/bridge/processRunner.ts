import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import type { AllowedAction, ProcessReceipt } from './actions'

export class EngineProcessTimeoutError extends Error {
  constructor(action: string, timeoutMs: number) {
    super(`Engine action ${action} timed out after ${timeoutMs}ms`)
    this.name = 'EngineProcessTimeoutError'
  }
}

export async function runProcess(spec: AllowedAction): Promise<ProcessReceipt> {
  return new Promise((resolveReceipt, rejectReceipt) => {
    execFile(
      spec.executable,
      [...spec.args],
      {
        cwd: resolve(process.cwd(), spec.cwd),
        encoding: 'utf8',
        maxBuffer: 1_048_576,
        timeout: spec.timeoutMs,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error === null) {
          resolveReceipt({ exitCode: 0, stdout, stderr })
          return
        }
        if (error.killed) {
          rejectReceipt(new EngineProcessTimeoutError(spec.action, spec.timeoutMs))
          return
        }
        if (typeof error.code === 'number') {
          resolveReceipt({ exitCode: error.code, stdout, stderr })
          return
        }
        rejectReceipt(error)
      },
    )
  })
}
