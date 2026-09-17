import { describe, expect, it } from "vitest";
import {
  FUNNEL_EVENT_NAMES,
  FUNNEL_EVENT_PROPS,
  FUNNEL_RESULT_VALUES,
  FUNNEL_SOURCES,
  FunnelBatcher,
  InMemoryFunnelTransport,
} from "../funnelTelemetry";
import {
  SURFACE_EVENT_NAMES,
  SURFACE_EVENT_PROPS,
  SURFACE_RESULT_VALUES,
  SURFACE_SOURCES,
  validateSurfaceEvent,
} from "../../../../learner/gate/netlify-functions/dojo-analytics-collector.mjs";

describe("emitter and collector runtime contract", () => {
  it("keeps all exported vocabulary tables equal", () => {
    expect(FUNNEL_SOURCES).toEqual(SURFACE_SOURCES);
    expect(FUNNEL_EVENT_NAMES).toEqual(SURFACE_EVENT_NAMES);
    expect(FUNNEL_RESULT_VALUES).toEqual(SURFACE_RESULT_VALUES);
    expect(FUNNEL_EVENT_PROPS).toEqual(SURFACE_EVENT_PROPS);
  });

  it("accepts emitted events and rejects unknown properties", () => {
    for (const source of FUNNEL_SOURCES) {
      const transport = new InMemoryFunnelTransport();
      const batcher = new FunnelBatcher(source, transport, {
        createId: () => "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
        clock: () => new Date("2026-09-17T12:00:00Z"),
      });
      for (const name of FUNNEL_EVENT_NAMES) {
        const props = Object.fromEntries(
          FUNNEL_EVENT_PROPS[name].map((key) => [
            key,
            key === "result" ? FUNNEL_RESULT_VALUES[0] : "U2-key-value-store",
          ]),
        );
        expect(batcher.emit(name, props)).toBe(true);
      }
      batcher.flush("manual");
      expect(transport.batches).toHaveLength(1);
      expect(transport.batches[0].events).toHaveLength(FUNNEL_EVENT_NAMES.length);
      for (const event of transport.batches[0].events) {
        expect(validateSurfaceEvent(event)).toBe(true);
        expect(validateSurfaceEvent({
          ...event,
          props: { ...event.props, unknown: "must be rejected" },
        })).toBe(false);
      }
    }
  });
});
