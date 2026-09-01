"""Independent learner gate for JSON and NDJSON executable evidence.

Producer evidence never writes mastery; verified outcomes persist only through
``learner.substrate.gate``.

Package import is intentionally cheap: isolated stdin/stdout verifiers
(``literacy_bridge``, ``teaching_game_bridge``) must load without the
canonical-gate dependency stack (fsrs / substrate scheduling).
"""

from __future__ import annotations

from typing import Any

__all__ = ["GateDecision", "verify_and_gate"]

_CANONICAL_ATTRS = frozenset(
    {
        "GateDecision",
        "GateIntegrityError",
        "verify_and_gate",
        "_check_evidence",
        "_check_evidence_semantics",
        "_decide",
        "_load_matching_evidence",
    }
)
_IO_ATTRS = frozenset({"load_evidence", "load_evidence_ndjson", "select_evidence"})


def __getattr__(name: str) -> Any:
    if name in _CANONICAL_ATTRS:
        import learner.gate.canonical_gate as canonical

        value = getattr(canonical, name)
        globals()[name] = value
        return value
    if name in _IO_ATTRS:
        from learner.gate.evidence_io import load_evidence, load_evidence_ndjson, select_evidence

        mapping = {
            "load_evidence": load_evidence,
            "load_evidence_ndjson": load_evidence_ndjson,
            "select_evidence": select_evidence,
        }
        globals().update(mapping)
        return mapping[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
