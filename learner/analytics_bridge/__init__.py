"""AID-5009 — bridge between the canonical learner analytics schema
(`learner/analytics_events/`, merged via PR #621) and the product event
emitters of `engines/literacyDojo` (envelope v2) and
`engines/codexdojo-os-prototype` (envelope v1).

Three deterministic, stdlib-only layers:

1. `envelopes` — structural validation of emitted events, driven by the SAME
   shared vocabularies the TypeScript emitters and the same-origin collector
   read (`engines/shared/teaching-evidence/vocabularies/{literacy,os}.json`).
   No vocabulary is duplicated here; drift fails loudly and closed.
2. `funnel` / `retention` — dictionary v1 (`learner/analytics_metrics/`)
   derivations over validated events: dedup by `eventId`, session funnel,
   retry, deterministic error (literacy) / error proxy (OS), resumption,
   retention windows R1/R7/R21 by `installationId`, k>=5 suppression,
   honest zeros (`not_measured` with reason, never 0).
3. `canonical` — fail-closed projection of engine events into canonical
   `schema.v3` records, gated by `learner/analytics_events/validate.py`.
   Only events whose EVERY canonical field has a sound source are emitted;
   everything else is reported in the mapping matrix with named gap codes
   (TF-1, TF-3, G8, ...). The projection never invents identity, verdicts or
   timing.

Golden rule (house): conclusion never equals mastery; analytics measures
experience, evidence measures outcome; absence is `not_measured`, not zero.
"""

from . import canonical, envelopes, funnel, retention, vocabularies

BRIDGE_VERSION = "aid5009-v1"

__all__ = ["BRIDGE_VERSION", "canonical", "envelopes", "funnel", "retention", "vocabularies"]
