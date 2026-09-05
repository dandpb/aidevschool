/**
 * Type surface of the canonical same-origin analytics collector for consumers
 * inside the OS engine's typecheck (collectorParity.test.ts). The function
 * itself is plain ESM staged into the Netlify bundle; only the parity-test
 * imports need these types.
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
export declare function createCollectorHandler(options?: { sink?: { append(events: unknown[]): Promise<void> } }): (request: Request) => Promise<Response>
declare const handler: (request: Request) => Promise<Response>
export default handler
