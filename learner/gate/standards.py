"""Empirical-gate standards: the numeric bar and the judgment that applies it.

Home of the Learner Journey's verification judgment since 2026-09-13, moved
from ``curriculum/_shared/evidence.py``: the rules that decide whether
evidence proves mastery belong with the context that owns mastery, not with
curriculum tooling.

Two layers:

- **The bar.** :func:`load_thresholds` reads the declared seam
  (``engines/minimaxDojo/config/learner.yaml``, per root ``AGENTS.md``) on
  every call and fails loudly when it is missing or malformed — there is no
  fallback. :func:`effective_thresholds` overlays a unit's own
  ``empirical_gate`` block when it declares one.
- **The judgment.** :class:`VerifierVerdict`, the game rubric machinery
  (:func:`independently_verified_pass`), :func:`game_metric_violations`, and
  the shape-detecting :func:`check_evidence` / :func:`passes_gate` wrappers.
"""

from __future__ import annotations

import json
import math
import operator
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping, TypeGuard

import yaml

from shared.errors import StateCorruptionError
from shared.fsio import resolve_contained

REPO_ROOT = Path(__file__).resolve().parents[2]

#: The declared numeric seam (root ``AGENTS.md`` §CONVENTIONS). The live gate
#: reads this file at judgment time; nothing may hardcode its numbers.
DEFAULT_SEAM_PATH = REPO_ROOT / "engines" / "minimaxDojo" / "config" / "learner.yaml"


class ThresholdSeamError(ValueError):
    """The declared threshold seam is missing, unreadable, or incomplete.

    Subclasses :class:`ValueError` so existing CLI boundaries that catch
    ``ValueError`` surface it as a clean non-zero exit naming the path.
    """


@dataclass(frozen=True, slots=True)
class Thresholds:
    """The empirical bar applied to one judgment."""

    mutation_min: float
    coverage_min: float


def load_thresholds(config_path: Path | str | None = None) -> Thresholds:
    """Load the empirical bar from the declared seam. No fallback.

    Raises :class:`ThresholdSeamError` naming the path when the file is
    missing, unreadable, not a mapping with a ``gates`` block, or when either
    threshold is missing or outside ``[0, 1]``.
    """
    path = Path(config_path) if config_path else DEFAULT_SEAM_PATH
    gates = _load_threshold_gates(path)
    return Thresholds(
        mutation_min=_threshold_value(gates, "mutation_score_min", path),
        coverage_min=_threshold_value(gates, "cobertura_nucleo_min", path),
    )


def _load_threshold_gates(path: Path) -> dict[str, Any]:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise ThresholdSeamError(
            f"threshold seam missing: {path} — restore the seam or the gate "
            "cannot judge evidence (no fallback exists by design)"
        ) from exc
    except OSError as exc:
        raise ThresholdSeamError(f"threshold seam unreadable at {path}: {exc}") from exc
    try:
        doc = next((d for d in yaml.safe_load_all(text) if d is not None), None)
    except yaml.YAMLError as exc:
        raise ThresholdSeamError(
            f"threshold seam at {path} is not valid YAML: {exc}"
        ) from exc
    if not isinstance(doc, dict) or not isinstance(doc.get("gates"), dict):
        raise ThresholdSeamError(
            f"threshold seam {path} must be a YAML mapping with a 'gates' block"
        )
    return doc["gates"]


def _threshold_value(gates: dict[str, Any], key: str, path: Path) -> float:
    raw = gates.get(key)
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise ThresholdSeamError(
            f"threshold seam {path}: gates.{key} must be a number in "
            f"[0, 1], got {raw!r}"
        ) from None
    if not 0.0 <= value <= 1.0:
        raise ThresholdSeamError(
            f"threshold seam {path}: gates.{key}={value} is outside [0, 1]"
        )
    return value


def effective_thresholds(
    unit_gate: Mapping[str, Any] | None,
    base: Thresholds | None = None,
) -> Thresholds:
    """Resolve the bar for one unit: its own ``empirical_gate`` over the seam.

    A unit declares per-unit values as ``mutation_min`` / ``min_coverage``
    (the ``active_unit.empirical_gate`` shape in ``learning_state.yaml``).
    Absent keys fall back to ``base`` (the seam when not given).
    """
    th = base if base is not None else load_thresholds()
    if not unit_gate:
        return th
    resolved = {
        "mutation_min": unit_gate.get("mutation_min", th.mutation_min),
        "coverage_min": unit_gate.get("min_coverage", th.coverage_min),
    }
    for key, value in resolved.items():
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise ThresholdSeamError(
                f"active_unit.empirical_gate.{key} must be a number, got {value!r}"
            ) from None
        if not 0.0 <= number <= 1.0:
            raise ThresholdSeamError(
                f"active_unit.empirical_gate.{key}={number} is outside [0, 1]"
            )
        resolved[key] = number
    return Thresholds(**resolved)


# ---------------------------------------------------------------------------
# Verifier verdict — the record judgment reads
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class VerifierVerdict:
    """The verifier block from ``status_schema.md`` §Verifier Evidence."""

    mutation_score: float | None  # PASS needs >= seam mutation_min
    coverage_core: float | None  # PASS needs >= seam coverage_min
    context_isolated: bool | None  # PASS needs True
    verdict: str  # "PASS" | "FAIL" | "UNKNOWN"
    source: str = ""

    @property
    def verified_pass(self) -> bool:
        """True only when PASS carries complete, trustworthy gate metrics."""
        th = load_thresholds()
        mutation = self.mutation_score
        coverage = self.coverage_core
        return (
            self.verdict == "PASS"
            and _is_finite_number(mutation)
            and mutation >= th.mutation_min
            and _is_finite_number(coverage)
            and coverage >= th.coverage_min
            and self.context_isolated is True
        )


def verdict_blockers(
    verdict: VerifierVerdict, thresholds: Thresholds | None = None
) -> tuple[str, ...]:
    """Human-readable reasons the verdict does not meet the bar (empty when it does)."""
    th = thresholds if thresholds is not None else load_thresholds()
    blockers: list[str] = []
    if verdict.verdict != "PASS":
        blockers.append(f"verifier verdict is {verdict.verdict!r}, not PASS")
    mutation = verdict.mutation_score
    if not _is_finite_number(mutation):
        blockers.append("mutation_score must be a finite number")
    elif mutation < th.mutation_min:
        blockers.append(f"mutation_score {mutation} < {th.mutation_min}")
    coverage = verdict.coverage_core
    if not _is_finite_number(coverage):
        blockers.append("coverage_core must be a finite number")
    elif coverage < th.coverage_min:
        blockers.append(f"coverage_core {coverage} < {th.coverage_min}")
    if verdict.context_isolated is not True:
        blockers.append("verifier not context-isolated")
    return tuple(blockers)


def verdict_passed(
    verdict: VerifierVerdict, thresholds: Thresholds | None = None
) -> bool:
    """True when the verdict meets the bar (the projection-facing predicate)."""
    return not verdict_blockers(verdict, thresholds)


def challenge_gate_blockers(
    attempt_present: bool,
    verdict: VerifierVerdict,
    thresholds: Thresholds | None = None,
) -> tuple[str, ...]:
    """The learning-gate invariant: attempt-before-solution + verifier PASS.

    This is the judgment that used to live inside
    ``ChallengeEvidence.gate_blockers``; curriculum delegates to it.
    """
    blockers: list[str] = []
    if not attempt_present:
        blockers.append("missing learner attempt (docs/diagnostic.md)")
    blockers.extend(verdict_blockers(verdict, thresholds))
    return tuple(blockers)


# ---------------------------------------------------------------------------
# Game rubrics and metric violations
# ---------------------------------------------------------------------------

#: Failure-metric vocabularies derive from the committed snapshot
#: (``learner/gate/metric_failure_snapshot.yaml``) — nothing hardcodes
#: failure metric names. Derivation is lazy (first violation check), keeping
#: package import cheap; a missing/malformed snapshot still fails loudly via
#: :class:`MetricSnapshotError` at every judgment rather than yielding an
#: empty vocabulary. Seeded and maintained by
#: ``python3 -m learner.gate.metric_lint``.
from learner.gate.metric_snapshot import failure_vocabularies  # noqa: E402


@lru_cache(maxsize=1)
def _failure_vocabularies_cached() -> tuple[frozenset[str], frozenset[str]]:
    """Lazy memoized derivation: importing this package stays cheap (the
    documented discipline at the top of ``learner/gate/__init__.py``); the
    snapshot is loaded on first violation check instead, still fail-closed
    via :class:`MetricSnapshotError` at every judgment."""
    return failure_vocabularies()


def _is_finite_number(value: Any) -> TypeGuard[float]:
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    return isinstance(value, float) and math.isfinite(value)

def _field_value(source: dict[str, Any], dotted: str) -> Any:
    """Resolve a dotted path such as ``metrics.good_admits`` against a dict."""
    current: Any = source
    for part in dotted.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def _eval_predicate(predicate: dict[str, Any], evidence: dict[str, Any]) -> bool:
    """Evaluate one catalog predicate against an evidence record."""
    op = predicate["op"]
    value = _field_value(evidence, predicate["field"])
    if op == "is_false":
        return value is False
    if op == "is_true":
        return value is True
    if not _is_finite_number(value):
        return False
    numeric_value = float(value)
    target = predicate["value"]
    comparisons = {
        "eq": operator.eq,
        "gt": operator.gt,
        "gte": operator.ge,
        "lt": operator.lt,
        "lte": operator.le,
    }
    compare = comparisons.get(op)
    if compare is None:
        raise ValueError(f"unknown rubric predicate op: {op!r}")
    return compare(numeric_value, target)


def _match_selector(selector: dict[str, Any], evidence: dict[str, Any]) -> bool:
    """True when every selector key equals the corresponding evidence value."""
    for key, expected in selector.items():
        if _field_value(evidence, key) != expected:
            return False
    return True


# Evidence rubric catalog loaded from ``evidence_rubrics.yaml`` (moved here
# with the judgment on 2026-09-13). Kept module-local so
# ``independently_verified_pass`` and the contract tests share exactly the
# same predicates without re-parsing.
_RUBRICS_PATH = Path(__file__).with_name("evidence_rubrics.yaml")
_RUBRIC_CATALOG: dict[str, Any] = yaml.safe_load(_RUBRICS_PATH.read_text(encoding="utf-8"))


def _rubric_for_evidence(evidence: dict[str, Any]) -> dict[str, Any] | None:
    """Return the first catalog rubric whose selector matches the evidence."""
    for rubric in _RUBRIC_CATALOG.get("rubrics", []):
        if _match_selector(rubric.get("selector", {}), evidence):
            return rubric
    return None


def _rubric_pass(rubric: dict[str, Any], evidence: dict[str, Any]) -> bool:
    """True when the rubric's predicates pass and failure metrics are clean."""
    for predicate in rubric.get("pass_when", []):
        if not _eval_predicate(predicate, evidence):
            return False
    if rubric.get("apply_failure_metrics"):
        return not game_metric_violations(evidence)
    return True


def game_metric_violations(
    evidence: dict[str, Any],
    *,
    vocabularies: tuple[frozenset[str], frozenset[str]] | None = None,
) -> list[str]:
    """Failure-metric violations in ``evidence``.

    ``vocabularies`` injects the (nonzero, true) name sets — tests and
    tooling pass their own; the default derives lazily from the committed
    metric-failure snapshot.
    """
    nonzero, true = vocabularies or _failure_vocabularies_cached()
    metrics = evidence.get("metrics")
    sources = [evidence]
    if isinstance(metrics, dict):
        sources.append(metrics)

    violations: list[str] = []
    for source in sources:
        for name, value in source.items():
            violation = _metric_violation(name, value, nonzero, true)
            if violation is not None:
                violations.append(violation)
    return violations


def _metric_violation(
    name: str, value: Any, nonzero: frozenset[str], true: frozenset[str]
) -> str | None:
    if name in nonzero or name.endswith("_violations"):
        if isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0:
            return f"{name}={value}"
    elif name in true and value is True:
        return f"{name}=true"
    return None


def _verifier_result(verifier: dict[str, Any]) -> tuple[bool | None, list[str]]:
    verdict = verifier.get("verdict")
    if verdict == "FAIL":
        return False, ["independent verifier verdict is 'FAIL', not PASS"]
    if verdict != "PASS":
        return None, ["independent verifier verdict must be PASS or FAIL"]
    strict_verdict = VerifierVerdict(
        mutation_score=verifier.get("mutation_score"),
        coverage_core=verifier.get("coverage_core"),
        context_isolated=verifier.get("context_isolated"),
        verdict="PASS",
        source=str(verifier.get("source", "")),
    )
    if strict_verdict.verified_pass:
        return True, []
    errors = ["independent verifier PASS lacks complete gate metrics or thresholds"]
    for blocker in verdict_blockers(strict_verdict):
        if blocker == "verifier not context-isolated":
            blocker = "context_isolated is not true"
        errors.append(blocker)
    return None, errors


def independently_verified_pass(
    evidence: dict[str, Any],
) -> tuple[bool | None, list[str]]:
    """Evaluate evidence without trusting a producer-owned ``pass`` claim.

    Shape detection — no caller branches on unit kind:

    - **Curriculum shape** (``verifier`` block): enforce
      ``verdict == "PASS"`` with complete gate metrics at or above the seam.
    - **Game shape** (``pass`` field, no ``verifier``): require a recognized
      empirical rubric. A producer-owned ``{"pass": true}`` claim is never
      sufficient evidence by itself.
    """
    verifier = evidence.get("verifier")
    if isinstance(verifier, dict):
        return _verifier_result(verifier)

    rubric = _rubric_for_evidence(evidence)
    if rubric is not None:
        if rubric.get("requires_verifier_receipt"):
            return None, [
                "producer pass has no independent verifier verdict or recognized empirical rubric"
            ]
        if _rubric_pass(rubric, evidence):
            return True, []
        return False, []

    return None, [
        "producer pass has no independent verifier verdict or recognized empirical rubric"
    ]


# ---------------------------------------------------------------------------
# Shape-detecting file gate
# ---------------------------------------------------------------------------


def _resolve_root(root: Path | str | None) -> Path:
    return Path(root) if root else REPO_ROOT


def check_evidence(
    evidence_path: str | Path,
    *,
    label: str = "",
    root: Path | str | None = None,
) -> list[str]:
    """Return labelled violations for an evidence file (``[]`` on pass).

    Never raises on read — missing/unparseable/escaping files yield a
    labelled error instead.
    """
    resolved_root = _resolve_root(root)
    prefix = f"{label}.evidence_file" if label else "evidence_file"

    try:
        resolved = resolve_contained(Path(evidence_path), resolved_root)
    except StateCorruptionError:
        return [f"{prefix} escapes root: {evidence_path!r}"]
    try:
        text = resolved.read_text(encoding="utf-8")
    except FileNotFoundError:
        return [f"{prefix} points at a missing path: {evidence_path!r}"]
    try:
        raw = json.loads(text)
    except json.JSONDecodeError as exc:
        return [
            f"{prefix} is not parseable JSON ({evidence_path!r}): "
            f"{exc.msg} at line {exc.lineno}"
        ]
    return _evidence_shape_errors(raw, evidence_path, prefix)


def _evidence_shape_errors(
    raw: Any, evidence_path: str | Path, prefix: str
) -> list[str]:
    if not isinstance(raw, dict):
        return [f"{prefix} is valid JSON but not an object: {evidence_path!r}"]
    if "verifier" not in raw and "pass" not in raw:
        return [
            f"{prefix} has no 'verifier' block or 'pass' field ({evidence_path!r})"
        ]
    if "pass" in raw and "verifier" in raw:
        return [
            f"{prefix} embeds a producer-controlled 'verifier' block; "
            f"use a separate verifier receipt ({evidence_path!r})"
        ]
    return _verification_errors(raw, evidence_path, prefix)


def _verification_errors(
    raw: dict[str, Any], evidence_path: str | Path, prefix: str
) -> list[str]:
    verified_pass, verification_errors = independently_verified_pass(raw)
    if verified_pass is True:
        return []
    details = _failed_evidence_details(raw, verified_pass, verification_errors)
    return [f"{prefix} {detail} ({evidence_path!r})" for detail in details]


def _failed_evidence_details(
    raw: dict[str, Any], verified_pass: bool | None, errors: list[str]
) -> list[str]:
    if errors:
        if raw.get("pass") is True:
            errors.extend(
                "claimed-versus-verified disagreement: " + detail
                for detail in game_metric_violations(raw)
            )
        return errors
    if raw.get("pass") is True:
        disagreements = game_metric_violations(raw) or ["empirical rubric did not pass"]
        return ["claimed-versus-verified disagreement: " + detail for detail in disagreements]
    if verified_pass is False:
        return ["independently verified evidence did not pass"]
    return ["evidence pass=false"]


def passes_gate(
    evidence_path: str | Path,
    *,
    root: Path | str | None = None,
) -> bool:
    """True if the evidence file passes the gate (shape-detecting)."""
    return len(check_evidence(evidence_path, root=root)) == 0


__all__ = [
    "DEFAULT_SEAM_PATH",
    "ThresholdSeamError",
    "Thresholds",
    "VerifierVerdict",
    "load_thresholds",
    "effective_thresholds",
    "verdict_blockers",
    "verdict_passed",
    "challenge_gate_blockers",
    "game_metric_violations",
    "independently_verified_pass",
    "check_evidence",
    "passes_gate",
]
