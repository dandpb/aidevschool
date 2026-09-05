"""Shared verifier seam: one protocol, two independent adapters.

The game verifier wraps the existing ``verify_and_gate`` path (stateful learner
gate). The literacy verifier wraps ``literacy_verifier`` (stateless no-code
judgment). Both return a common ``Verdict`` so the CLI can print and exit without
knowing which domain produced the evidence.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from learner.gate.canonical_gate import (
    GateDecision,
    _check_evidence_semantics,
    verify_and_gate,
)
from learner.gate.evidence_io import (
    load_evidence,
    load_evidence_ndjson,
    select_evidence,
)
from learner.gate.literacy_verifier import (
    load_literacy_evidence,
    verify_literacy_evidence,
)
from learner.gate.verifier_receipt import load_verifier_receipt
from learner.substrate import load_and_validate

#: Preferred evidence source: the NDJSON contract written by the Playwright
#: smoke run (see EVIDENCE_CONTRACT.md), then the legacy single-record file.
#: Kept in the deep module so CLI and tests share the same fallback order.
DEFAULT_EVIDENCE_CANDIDATES = (
    "engines/pixelDojo/pixel-quest/.logs/evidence.ndjson",
    "engines/pixelDojo/.logs/last_run_evidence.json",
)


@dataclass(frozen=True, slots=True)
class Verdict:
    """Common outcome shape returned by every verifier adapter."""

    passed: bool
    errors: tuple[str, ...]
    gate_outcome: str = ""
    rating: str = ""
    mastery_eligible: bool | None = None
    verifier_source: str = ""
    receipt: Any | None = None
    # True when the file exists but holds no record for the active unit.
    nothing_to_grade: bool = False


class Verifier(Protocol):
    """Protocol for a shape-detecting verifier."""

    def verify(
        self,
        evidence_path: str | Path,
        *,
        root: Path,
        dry_run: bool = False,
        verifier_receipt_path: str | Path | None = None,
    ) -> Verdict:
        ...


def resolve_evidence(
    root: Path,
    explicit: str | None,
    unit: dict[str, Any],
) -> Path | None:
    """Explicit path wins; otherwise the first existing candidate wins.

    The unit's own ``evidence_file`` is checked first so non-pixelDojo engines
    (voxelDojo, literacyDojo) are graded without requiring ``--evidence``.
    """
    if explicit:
        return Path(explicit)
    for candidate in (unit.get("evidence_file"), *DEFAULT_EVIDENCE_CANDIDATES):
        if not candidate:
            continue
        path = root / candidate
        if path.exists():
            return path
    return None


def load_one_evidence(
    evidence_path: str | Path,
    active_unit: dict[str, Any],
) -> dict[str, Any] | None:
    """Load the one evidence record relevant to the active unit."""
    path = Path(evidence_path)
    if path.suffix == ".ndjson":
        return select_evidence(load_evidence_ndjson(path), active_unit)
    return load_evidence(path)


def detect_evidence_shape(evidence: dict[str, Any]) -> str:
    """Return ``"literacy"`` or ``"game"`` based on producer-owned fields."""
    if evidence.get("source") == "literacydojo":
        return "literacy"
    if "schemaVersion" in evidence or "verifierRequired" in evidence:
        return "literacy"
    return "game"


def _gate_decision_to_verdict(decision: GateDecision | None) -> Verdict:
    if decision is None:
        return Verdict(
            passed=False,
            errors=(),
            nothing_to_grade=True,
        )
    return Verdict(
        passed=decision.passed,
        errors=decision.errors,
        gate_outcome=decision.gate_outcome,
        rating=decision.rating,
        receipt=decision.receipt,
    )


class GameVerifier:
    """Adapter around the existing learner.gate stateful path."""

    def verify(
        self,
        evidence_path: str | Path,
        *,
        root: Path,
        dry_run: bool = False,
        verifier_receipt_path: str | Path | None = None,
    ) -> Verdict:
        decision = verify_and_gate(
            root,
            evidence_path,
            dry_run=dry_run,
            verifier_receipt_path=verifier_receipt_path,
        )
        return _gate_decision_to_verdict(decision)


class LiteracyVerifier:
    """Adapter around the no-code LiteracyDojo verifier."""

    def verify(
        self,
        evidence_path: str | Path,
        *,
        root: Path,
        dry_run: bool = False,
        verifier_receipt_path: str | Path | None = None,
    ) -> Verdict:
        # Literacy evidence is self-contained; receipt/state mechanics do not
        # apply. ``dry_run`` is accepted for protocol uniformity but changes
        # nothing — this verifier never writes learner state.
        del dry_run, verifier_receipt_path
        evidence = load_literacy_evidence(evidence_path)
        literacy_verdict = verify_literacy_evidence(evidence)
        return Verdict(
            passed=literacy_verdict.passed,
            errors=literacy_verdict.errors,
            mastery_eligible=literacy_verdict.mastery_eligible,
            verifier_source=literacy_verdict.source,
        )


def dry_run_semantic_check(
    evidence_path: str | Path,
    *,
    root: Path,
    active_unit: dict[str, Any],
    verifier_receipt_path: str | Path | None = None,
) -> Verdict:
    """Check evidence semantics without requiring the unit to be ``evaluating``.

    This is the dry-run-only path used when the CLI is given an explicit
    evidence file for a unit that is not awaiting verification. It reuses
    ``_check_evidence_semantics`` rather than reimplementing it.
    """
    evidence = load_one_evidence(evidence_path, active_unit)
    if evidence is None:
        return Verdict(
            passed=False,
            errors=(),
            nothing_to_grade=True,
        )
    verifier_receipt = (
        load_verifier_receipt(verifier_receipt_path, root)
        if verifier_receipt_path is not None
        else None
    )
    semantic_errors = _check_evidence_semantics(
        evidence, active_unit, verifier_receipt
    )
    if semantic_errors:
        return Verdict(passed=False, errors=tuple(semantic_errors))
    return Verdict(
        passed=True,
        errors=(),
        gate_outcome="semantic_pass",
        rating="dry_run",
    )


def load_state(root: Path) -> dict[str, Any]:
    """Load and validate learner/learning_state.yaml (deep-module helper)."""
    return load_and_validate(root / "learner" / "learning_state.yaml")
