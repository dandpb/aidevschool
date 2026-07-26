import { analyticsEventIsValid, type AnalyticsEvent } from '../src/analytics/events'

export type AnalyticsBatchRequest = {
  readonly schemaVersion: 1
  readonly events: readonly AnalyticsEvent[]
}

export type AnalyticsBatchSink = (
  batch: AnalyticsBatchRequest,
) => Promise<{ readonly acceptedEventIds: readonly string[] }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function decodeAnalyticsBatch(value: unknown): AnalyticsBatchRequest | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 2 ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.events) ||
    value.events.length === 0 ||
    value.events.length > 50 ||
    !value.events.every(analyticsEventIsValid)
  ) {
    return null
  }
  const eventIds = value.events.map((event) => event.eventId)
  if (new Set(eventIds).size !== eventIds.length) return null
  for (let index = 1; index < value.events.length; index += 1) {
    const previous = value.events[index - 1]
    const current = value.events[index]
    if (previous === undefined || current === undefined || current.sequence <= previous.sequence) {
      return null
    }
  }
  return value as AnalyticsBatchRequest
}

export const acceptAnalyticsBatch: AnalyticsBatchSink = async (batch) => ({
  acceptedEventIds: batch.events.map((event) => event.eventId),
})
