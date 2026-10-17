"""Single-source vocabularies for the bridge.

Reads the same shared JSON that feeds the TypeScript emitters and the
same-origin collector (`engines/shared/teaching-evidence/vocabularies/`).
No vocabulary is copied into this package: unknown event names, unknown prop
keys and out-of-policy values fail closed in `envelopes`. If the shared JSON
gains events, the bridge picks them up; if it loses them, validation errors.
"""
from __future__ import annotations

import json
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
VOCAB_DIR = _REPO_ROOT / "engines" / "shared" / "teaching-evidence" / "vocabularies"


def _load(name: str) -> dict:
    return json.loads((VOCAB_DIR / name).read_text(encoding="utf-8"))


_literacy = _load("literacy.json")
_os = _load("os.json")

# literacy v2 (engines/literacyDojo/src/domain/analytics.ts) — the route
# value vocabulary is enforced inline in the TS emitter (route_chosen:
# guided|intermediate) and is not part of the shared JSON; kept here with the
# source reference so the two stay reviewable together.
LITERACY_EVENT_NAMES: tuple[str, ...] = tuple(_literacy["eventNames"])
LITERACY_EVENT_PROPS: dict[str, tuple[str, ...]] = {
    k: tuple(v) for k, v in _literacy["eventProps"].items()
}
LITERACY_OPTIONAL_PROPS: dict[str, tuple[str, ...]] = {
    k: tuple(v) for k, v in _literacy["optionalProps"].items()
}
LITERACY_ENTRY_ROUTES: tuple[str, ...] = tuple(_literacy["entryRoutes"])
LITERACY_ACTIVITY_TYPES: tuple[str, ...] = tuple(_literacy["activityTypes"])
LITERACY_ROUTES: tuple[str, ...] = ("guided", "intermediate")

# OS v1 (engines/codexdojo-os-prototype/src/analytics/events.ts)
OS_EVENT_NAMES: tuple[str, ...] = tuple(_os["eventNames"])
OS_EVENT_VOCABULARIES: dict[str, dict[str, tuple[str, ...] | None]] = {
    name: {k: (tuple(v) if v is not None else None) for k, v in vocab.items()}
    for name, vocab in _os["eventVocabularies"].items()
}
OS_CONTEXT_KEYS: tuple[str, ...] = tuple(_os["contextKeys"])
OS_CONTEXT_VOCABULARIES: dict[str, tuple[str, ...] | None] = {
    k: (tuple(v) if v is not None else None) for k, v in _os["contextVocabularies"].items()
}

# Canonical schema v3 (learner/analytics_events/schema.v3.json)
CANONICAL_SCHEMA_V3_PATH = _REPO_ROOT / "learner" / "analytics_events" / "schema.v3.json"
