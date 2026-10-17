"""Canonical projection: engine envelopes -> schema.v3 (AID-5009).

The bridge's contract with `learner/analytics_events/` (canonical learner
analytics schema, PR #621): every projected record is gated by that
package's own deterministic validator (`validate.validate_event`, schema
v3) BEFORE it is emitted — fail-closed. If the canonical validator ever
rejects a projection, this module raises: that is a bridge bug, never
silently dropped data.

Projection is conservative by design: a canonical field without a SOUND
source in the source envelope blocks the projection, and the omission is
reported with a stable gap code (machine-readable audit trail):

- objective-id-not-emitted      — no emitter publishes objective_id+entry at
                                  entry time (canonical `objective_viewed`
                                  has no producer on either engine today).
- latency-not-emitted           — canonical `attempt_feedback_shown` requires
                                  latency_ms; no envelope emits timing
                                  (TF-1 family, dictionary §feedback).
- verdict-attribution-co-occurrence — OS v1 has no attempt_id (TF-3);
                                  verdict attribution only co-occurs at
                                  (installation, session, mission) grain.
- mode-vocabulary-mismatch      — OS mission modes (initial|review|retry|
                                  targeted-practice) have no declared
                                  correspondence to the canonical
                                  practice|assessment enum.
- attempt-id-not-guaranteed-uuid4 — OS eventId grammar (SAFE_IDENTIFIER)
                                  does not guarantee a canonical uuid4.
- mission-id-not-guaranteed     — OS missionId is optional context, not a
                                  guaranteed dimension of submitted.
- evidence-channel-separate     — `evidence_recorded` belongs to the
                                  evidence channel (ADR-0009); analytics
                                  never carries verifier digests.
- export-consent-not-instrumented — no emitter for `export_consented`.
- no-canonical-target           — the emitted event has no canonical event
                                  type that preserves its meaning (e.g.
                                  lesson/mission completion: schema v3 has
                                  no completion stage).
- event-id-not-canonical-uuid4  — source eventId is not a canonical uuid4
                                  (checked with the schema's own regex);
                                  ids are never rewritten.
- occurred-at-not-canonical     — source timestamp does not match the
                                  canonical ISO-8601 UTC grammar; timestamps
                                  are never rewritten.
- subject-id-not-canonical-uuid4 — source subject id (sessionId) is outside
                                  the canonical uuid4 grammar; ids are
                                  never rewritten.

The ONE sound attempt mapping today: literacy `activity_attempted` →
`attempt_started` (objective_id = props.lessonId; attempt_id/event_id =
eventId when uuid4; mode = constant "practice" — literacy lesson activities
are formative practice by design, `review_*` events are NOT projected;
subject_anon_id = sessionId with id_scope ephemeral-per-pageload, meaning
literacy subjects must never be joined across page loads; retention for
literacy stays G8-not_measured in `retention.py`).
"""
from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

from . import vocabularies as V

_UUID4_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
_ISO_CANONICAL_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$")

LITERACY_MODULE = "literacy-dojo"
OS_MODULE = "codexdojo-os"
SUBJECT_ID_SCOPES = {
    "literacy": "ephemeral-per-pageload (sessionId — never joined across page loads; G8)",
    "os": "pseudonymous-installation (installationId; dictionary §envelopes os_v1)",
}


def _load_canonical_validator():
    """Import learner/analytics_events/validate.py by path (no package
    assumptions — the module has no __init__.py by design)."""
    path = V.CANONICAL_SCHEMA_V3_PATH.parent / "validate.py"
    spec = importlib.util.spec_from_file_location("analytics_events_validate", path)
    if spec is None or spec.loader is None:  # pragma: no cover
        raise RuntimeError(f"cannot load canonical validator at {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


canonical_validate = _load_canonical_validator()


def _schema_v3() -> dict:
    return json.loads(V.CANONICAL_SCHEMA_V3_PATH.read_text(encoding="utf-8"))


def _strip_label(ev: dict) -> dict:
    return {k: v for k, v in ev.items() if k != "synthetic"}


def _literacy_skip_gap(ev: dict) -> str:
    if ev.get("event") == "entry_viewed":
        return "objective-id-not-emitted"
    return "no-canonical-target"


def _literacy_projection_gap(ev: dict) -> str | None:
    """First blocking gap for a sound `activity_attempted` projection."""
    event_id = ev.get("eventId", "")
    if not _UUID4_RE.match(event_id):
        return "event-id-not-canonical-uuid4"
    # subject_anon_id must be a canonical uuid4 too; a session id outside the
    # canonical grammar is a DATA condition -> skip with gap, never rewrite.
    if not _UUID4_RE.match(str(ev.get("sessionId", ""))):
        return "subject-id-not-canonical-uuid4"
    if not _ISO_CANONICAL_RE.match(str(ev.get("occurredAt", ""))):
        return "occurred-at-not-canonical"
    lesson_id = ev.get("props", {}).get("lessonId")
    if not (isinstance(lesson_id, str) and lesson_id):
        return "objective-id-not-emitted"
    return None


def project_literacy_attempt(ev: dict, schema: dict) -> tuple[dict | None, str | None]:
    """`activity_attempted` -> canonical `attempt_started`, fail-closed."""
    ev = _strip_label(ev)
    if ev.get("event") != "activity_attempted":
        return None, _literacy_skip_gap(ev)
    gap = _literacy_projection_gap(ev)
    if gap is not None:
        return None, gap
    event_id = ev.get("eventId", "")
    lesson_id = ev["props"]["lessonId"]
    projected = {
        "event_id": event_id,
        "event_type": "attempt_started",
        "occurred_at": ev["occurredAt"],
        "subject_anon_id": ev["sessionId"],
        "dojo": "literacyDojo",
        "module": LITERACY_MODULE,
        "payload": {
            "objective_id": lesson_id,
            "attempt_id": event_id,
            "mode": "practice",
        },
    }
    errors = canonical_validate.validate_event(projected, schema)
    if errors:  # pragma: no cover — bridge bug, never data
        raise RuntimeError(f"canonical validator rejected projection: {errors}")
    return projected, None


def project_event(ev: dict, stream: str, schema: dict) -> tuple[dict | None, str | None]:
    """Project one engine event; (None, gap_code) when no sound mapping."""
    if stream == "literacy":
        return project_literacy_attempt(ev, schema)
    if stream == "os":
        # The only candidate (structured_attempt.submitted -> attempt_started)
        # is blocked by the gaps below; everything else has no target either.
        return None, first_os_gap(ev)
    return None, "unknown-stream"


def first_os_gap(ev: dict) -> str:
    name = ev.get("name")
    if name == "structured_attempt.submitted":
        return "mode-vocabulary-mismatch"
    if name in {"onboarding.started", "mission.started"}:
        return "objective-id-not-emitted"
    return "no-canonical-target"


def project_stream(events: list[dict], stream: str) -> dict:
    """Project a deduped stream; deterministic order, full skip ledger."""
    schema = _schema_v3()
    projected: list[dict] = []
    skipped: list[dict] = []
    for ev in events:
        record, gap = project_event(ev, stream, schema)
        if record is None:
            skipped.append({"eventId": ev.get("eventId"), "gap": gap})
        else:
            projected.append(record)
    return {"projected": projected, "skipped": skipped}


def mapping_matrix() -> list[dict]:
    """Machine-readable coverage: canonical stage x engine -> status/gaps.

    Rows are derived from the same rules `project_event` enforces; the test
    suite pins them so drift between matrix and behavior fails CI.
    """
    return [
        {
            "canonical_event": "objective_viewed",
            "literacy": {"status": "gap", "gap_codes": ["objective-id-not-emitted"]},
            "os": {"status": "gap", "gap_codes": ["objective-id-not-emitted"]},
        },
        {
            "canonical_event": "attempt_started",
            "literacy": {
                "status": "mappable",
                "from": ["activity_attempted"],
                "field_provenance": {
                    "objective_id": "props.lessonId",
                    "attempt_id": "eventId (uuid4 required, never rewritten)",
                    "mode": "constant 'practice' (lesson activities are formative practice; review_* not projected)",
                    "subject_anon_id": "sessionId (id_scope: ephemeral-per-pageload, G8)",
                    "module": f"constant '{LITERACY_MODULE}'",
                },
            },
            "os": {
                "status": "gap",
                "gap_codes": [
                    "mode-vocabulary-mismatch",
                    "attempt-id-not-guaranteed-uuid4",
                    "mission-id-not-guaranteed",
                    "verdict-attribution-co-occurrence",
                ],
            },
        },
        {
            "canonical_event": "attempt_feedback_shown",
            "literacy": {"status": "gap", "gap_codes": ["latency-not-emitted"]},
            "os": {
                "status": "gap",
                "gap_codes": ["latency-not-emitted", "verdict-attribution-co-occurrence"],
            },
        },
        {
            "canonical_event": "evidence_recorded",
            "literacy": {"status": "gap", "gap_codes": ["evidence-channel-separate"]},
            "os": {"status": "gap", "gap_codes": ["evidence-channel-separate"]},
        },
        {
            "canonical_event": "export_consented",
            "literacy": {"status": "gap", "gap_codes": ["export-consent-not-instrumented"]},
            "os": {"status": "gap", "gap_codes": ["export-consent-not-instrumented"]},
        },
    ]


def unmapped_emitters() -> dict:
    """Emitted events with NO canonical target (bidirectional audit)."""
    literacy = [e for e in V.LITERACY_EVENT_NAMES if e != "activity_attempted"]
    os_events = list(V.OS_EVENT_NAMES)
    return {"literacy": literacy, "os": os_events}
