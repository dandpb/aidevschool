/**
 * Type surface of the canonical same-origin analytics collector
 * (../netlify-functions/dojo-analytics-collector.mjs). AID-961 deploy gap
 * (b): this declaration moved OUT of the functions directory — the Netlify
 * deploy CLI treats `dojo-analytics-collector.d.mts` as a function file with
 * an invalid name and rejects the whole literacy deploy with 422 "Incorrect
 * function names" when `functions = ../../learner/gate/netlify-functions`.
 * It now lives with the offline analytics tooling; consumers importing the
 * runtime .mjs from a TS typecheck (collectorParity.test.ts) carry an
 * explicit @ts-expect-error and rely on the runtime parity assertions
 * instead of colocated declarations.
 */

export declare const ANALYTICS_COLLECTOR_PATH: string
export declare const ANALYTICS_BATCH_MAX_EVENTS: number
export declare const ANALYTICS_BODY_MAX_BYTES: number
export declare const ANALYTICS_RETENTION_DAYS: number

export declare class NdjsonFileSink {
  constructor(options?: { baseDir?: string; retentionDays?: number })
  append(events: unknown[], now?: Date): Promise<void>
  prune(now?: Date): Promise<void>
}

export declare const ANALYTICS_EVENT_NAMES: readonly string[]
export declare const EVENT_VOCABULARIES: Readonly<Record<string, Readonly<Record<string, readonly (string | number | boolean)[] | undefined>>>>
export declare const CONTEXT_KEYS: readonly string[]
export declare const CONTEXT_VOCABULARIES: Readonly<Record<string, readonly string[] | undefined>>

export declare function validateAnalyticsEvent(value: unknown): boolean
export declare function isAnalyticsBatch(value: unknown): boolean
export declare function createCollectorHandler(options?: {
  backing?: { append(events: unknown[], now?: Date): Promise<void>; readRange?(from: string, to: string): Promise<string[]>; prune?(now?: Date): Promise<void> }
  sink?: { append(events: unknown[]): Promise<void> }
  exportToken?: string
  now?: Date | (() => Date)
}): (request: Request) => Promise<Response>
declare const handler: (request: Request) => Promise<Response>
export default handler
