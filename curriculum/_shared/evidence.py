"""Curriculum evidence contract: typed challenge evidence behind a small interface.

Deep module (codebase-design): one ``inspect``/``commit`` pair hides phase detection,
artifact discovery, verdict aggregation, and gate composition. Shape-detecting wrappers
(``passes_gate``/``check_evidence``) unify game and curriculum evidence through one
validator path — no caller branches on unit kind.

On-disk contract (two-file split, following the ``pipeline_status.py`` precedent):

- ``curriculum/NN_slug/status.yaml`` — mutable lifecycle state (rewritten on commit).
- ``learner/evidence/NN_slug/evidence.ndjson`` — append-only verdict audit (one JSON
  object per line; last non-empty line wins).

``docs/status.md`` stays human narrative only and is never clobbered.

Contract reference: ``curriculum/_shared/project_template/docs/status_schema.md``
Precedent: ``engines/openclaw/runner/pipeline_status.py`` (YAML seam, MD narrative).
"""

from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import StrEnum
from pathlib import Path
from typing import Any, TypeGuard

import yaml

ROOT = Path(__file__).resolve().parent.parent.parent

# Gate thresholds — single source, matching learning_state.yaml > empirical_gate
# and status_schema.md §Verifier Evidence.
MUTATION_MIN = 0.65
COVERAGE_MIN = 0.80
LANGUAGES: tuple[str, ...] = ("go", "rust", "node")

_NONZERO_FAILURE_METRICS = frozenset(
    {
        "abusive_admitted",
        "guards_missed",
        "misroutes",
        "skipped_required",
    }
)
_TRUE_FAILURE_METRICS = frozenset(
    {
        "corrupt_load",
        "latency_over",
        "overflow",
        "overflowed",
        "overheated",
        "queue_overflowed",
        "reactor_overloaded",
    }
)

# Artifact paths relative to the challenge dir.
_ARTIFACT_PATHS: tuple[tuple[str, str], ...] = (
    ("spec", "docs/spec.md"),
    ("code_review", "docs/code_review.md"),
    ("benchmark_results", "docs/benchmark_results.md"),
    ("evolution_report", "docs/evolution_report.md"),
    ("diagnostic", "docs/diagnostic.md"),
)

_PHASE_RE = re.compile(r"phase:\s*`?([\w-]+)`?", re.IGNORECASE)


class Phase(StrEnum):
    SPEC = "spec"
    IMPL = "impl"
    REVIEW = "review"
    BENCHMARK = "benchmark"
    OPTIMIZE = "optimize"
    CYCLE_COMPLETE = "cycle-complete"


class _NoAliasDumper(yaml.SafeDumper):
    """Avoid anchors/aliases so status.yaml stays plain and greppable."""

    def ignore_aliases(self, data: Any) -> bool:  # noqa: ARG002
        return True


# ---------------------------------------------------------------------------
# Records (frozen dataclasses — the struct callers receive from inspect)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class VerifierVerdict:
    """The verifier block from status_schema.md §Verifier Evidence."""

    mutation_score: float | None  # PASS needs >= MUTATION_MIN
    coverage_core: float | None  # PASS needs >= COVERAGE_MIN
    context_isolated: bool | None  # PASS needs True
    verdict: str  # "PASS" | "FAIL" | "UNKNOWN"
    source: str = ""

    @property
    def verified_pass(self) -> bool:
        """True only when PASS carries complete, trustworthy gate metrics."""
        mutation = self.mutation_score
        coverage = self.coverage_core
        return (
            self.verdict == "PASS"
            and _is_finite_number(mutation)
            and mutation >= MUTATION_MIN
            and _is_finite_number(coverage)
            and coverage >= COVERAGE_MIN
            and self.context_isolated is True
        )


@dataclass(frozen=True)
class ArtifactRef:
    """One required artifact (file), relative to the challenge dir."""

    name: str
    rel_path: str
    exists: bool
    bytes: int


@dataclass(frozen=True)
class ChallengeEvidence:
    """Full typed evidence for one challenge — the return of :func:`inspect`.

    ``gate_ready`` is the single deepest payoff: the learning-gate invariant
    (attempt-before-solution + verifier PASS) encoded once, behind one property.
    """

    project_id: str
    phase: Phase
    implementations: dict[str, bool]  # {go, rust, node} -> impl dir non-empty
    artifacts: tuple[ArtifactRef, ...]
    attempt_present: bool
    verdict: VerifierVerdict
    benchmark_all_pass: bool | None

    @property
    def gate_ready(self) -> bool:
        """True when there are no gate blockers (attempt present + verifier PASS).

        Derives from :attr:`gate_blockers` so the two are always consistent —
        a lying verdict (``PASS`` with ``mutation_score`` below threshold) fails.
        """
        return len(self.gate_blockers) == 0

    @property
    def gate_blockers(self) -> tuple[str, ...]:
        """Human-readable reasons why gate_ready is False (empty when ready)."""
        blockers: list[str] = []
        if not self.attempt_present:
            blockers.append("missing learner attempt (docs/diagnostic.md)")
        v = self.verdict
        if v.verdict != "PASS":
            blockers.append(f"verifier verdict is {v.verdict!r}, not PASS")
        mutation = v.mutation_score
        if not _is_finite_number(mutation):
            blockers.append("mutation_score must be a finite number")
        elif mutation < MUTATION_MIN:
            blockers.append(f"mutation_score {mutation} < {MUTATION_MIN}")
        coverage = v.coverage_core
        if not _is_finite_number(coverage):
            blockers.append("coverage_core must be a finite number")
        elif coverage < COVERAGE_MIN:
            blockers.append(f"coverage_core {coverage} < {COVERAGE_MIN}")
        if v.context_isolated is not True:
            blockers.append("verifier not context-isolated")
        return tuple(blockers)


@dataclass(frozen=True)
class ChallengeStatus:
    """Lightweight per-challenge status for dashboard projection."""

    project_id: str
    phase: Phase
    passed: bool
    attempt_present: bool


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------


def _resolve_root(root: Path | str | None) -> Path:
    return Path(root) if root else ROOT


def _is_finite_number(value: Any) -> TypeGuard[float]:
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    return isinstance(value, float) and math.isfinite(value)


def _resolve_contained(path: Path, base: Path) -> Path:
    from engines.openclaw.errors import StateCorruptionError

    resolved_base = base.resolve()
    resolved = path.resolve() if path.is_absolute() else (resolved_base / path).resolve()
    if not resolved.is_relative_to(resolved_base):
        raise StateCorruptionError(f"path {path!s} escapes root {resolved_base!s}")
    return resolved


def _project_dir(base: Path, project_id: str) -> Path:
    from engines.openclaw.errors import StateCorruptionError

    project_path = Path(project_id)
    if project_path.is_absolute() or len(project_path.parts) != 1 or project_id in {"", ".", ".."}:
        raise StateCorruptionError(f"invalid project_id {project_id!r}: expected one slug")
    return _resolve_contained(project_path, base)


def _challenge_dir(project_id: str, root: Path) -> Path:
    return _project_dir(root / "curriculum", project_id)


def _status_yaml_path(project_id: str, root: Path) -> Path:
    return _challenge_dir(project_id, root) / "status.yaml"


def _status_md_path(project_id: str, root: Path) -> Path:
    return _challenge_dir(project_id, root) / "docs" / "status.md"


def _evidence_ndjson_path(project_id: str, root: Path) -> Path:
    return _project_dir(root / "learner" / "evidence", project_id) / "evidence.ndjson"


# ---------------------------------------------------------------------------
# Internal: phase detection (YAML first, Markdown fallback)
# ---------------------------------------------------------------------------


def _detect_phase(project_id: str, root: Path) -> Phase:
    """YAML first; Markdown fallback. Mirrors pipeline_status.load_status."""
    from engines.openclaw.errors import StateCorruptionError

    yaml_path = _status_yaml_path(project_id, root)
    if yaml_path.exists():
        try:
            data = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
        except (OSError, yaml.YAMLError) as exc:
            raise StateCorruptionError(f"Cannot read status YAML at {yaml_path}: {exc}") from exc
        if not isinstance(data, dict):
            raise StateCorruptionError(f"status YAML at {yaml_path} must be a mapping")
        phase_str = data.get("phase", "spec")
        try:
            return Phase(phase_str)
        except ValueError:
            raise StateCorruptionError(
                f"status YAML at {yaml_path}: unknown phase {phase_str!r}; "
                f"valid phases: {', '.join(p.value for p in Phase)}"
            ) from None

    # Markdown fallback (migration path for the 18 existing dirs).
    md_path = _status_md_path(project_id, root)
    if md_path.exists():
        try:
            text = md_path.read_text(encoding="utf-8")
        except OSError as exc:
            raise StateCorruptionError(f"Cannot read status at {md_path}: {exc}") from exc
        match = _PHASE_RE.search(text)
        if match:
            try:
                return Phase(match.group(1).lower())
            except ValueError:
                pass  # unrecognized phase in prose — fall through to default
    return Phase.SPEC


# ---------------------------------------------------------------------------
# Internal: artifact + implementation discovery
# ---------------------------------------------------------------------------


def _discover_artifacts(project_id: str, root: Path) -> tuple[ArtifactRef, ...]:
    challenge = _challenge_dir(project_id, root)
    refs: list[ArtifactRef] = []
    for name, rel in _ARTIFACT_PATHS:
        path = challenge / rel
        exists = path.is_file()
        size = path.stat().st_size if exists else 0
        refs.append(ArtifactRef(name=name, rel_path=rel, exists=exists, bytes=size))
    return tuple(refs)


def _discover_implementations(project_id: str, root: Path) -> dict[str, bool]:
    challenge = _challenge_dir(project_id, root)
    result: dict[str, bool] = {}
    for lang in LANGUAGES:
        impl_dir = challenge / f"{lang}-impl"
        result[lang] = impl_dir.is_dir() and any(impl_dir.iterdir())
    return result


def _read_benchmark_all_pass(project_id: str, root: Path) -> bool | None:
    """Read benchmark rollup from status.yaml (written by the verifier, not recomputed)."""
    yaml_path = _status_yaml_path(project_id, root)
    if not yaml_path.exists():
        return None
    try:
        data = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError):
        return None
    if not isinstance(data, dict):
        return None
    bench = data.get("benchmark")
    if isinstance(bench, dict):
        return bench.get("all_pass")
    return None


# ---------------------------------------------------------------------------
# Internal: verdict from evidence.ndjson (last non-empty line wins)
# ---------------------------------------------------------------------------


def _read_latest_verdict(project_id: str, root: Path) -> VerifierVerdict:
    ndjson_path = _evidence_ndjson_path(project_id, root)
    if not ndjson_path.exists():
        return VerifierVerdict(None, None, None, "UNKNOWN")
    try:
        lines = ndjson_path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return VerifierVerdict(None, None, None, "UNKNOWN")
    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            return VerifierVerdict(None, None, None, "UNKNOWN")
        if not isinstance(rec, dict):
            return VerifierVerdict(None, None, None, "UNKNOWN")
        return VerifierVerdict(
            mutation_score=rec.get("mutation_score"),
            coverage_core=rec.get("coverage_core"),
            context_isolated=rec.get("context_isolated"),
            verdict=rec.get("verdict", "UNKNOWN"),
            source=rec.get("source", ""),
        )
    return VerifierVerdict(None, None, None, "UNKNOWN")


# ---------------------------------------------------------------------------
# Public: entry points
# ---------------------------------------------------------------------------


def inspect(project_id: str, *, root: Path | str | None = None) -> ChallengeEvidence:
    """Return full typed evidence for one challenge.

    Cold-start (no status.yaml, no evidence.ndjson) is a valid state, not an
    error: returns ``phase=SPEC``, all ``exists=False``, ``gate_ready=False``.
    """
    root = _resolve_root(root)
    artifacts = _discover_artifacts(project_id, root)
    attempt_present = any(
        a.name == "diagnostic" and a.exists and a.bytes > 0 for a in artifacts
    )
    return ChallengeEvidence(
        project_id=project_id,
        phase=_detect_phase(project_id, root),
        implementations=_discover_implementations(project_id, root),
        artifacts=artifacts,
        attempt_present=attempt_present,
        verdict=_read_latest_verdict(project_id, root),
        benchmark_all_pass=_read_benchmark_all_pass(project_id, root),
    )


def commit(report: ChallengeEvidence, *, root: Path | str | None = None) -> Path:
    """Write ``status.yaml`` atomically (mutable lifecycle state).

    Does not touch ``docs/status.md`` (human narrative) or ``evidence.ndjson``
    (append-only audit — use :func:`record_verdict` for that).
    """
    from engines.openclaw.errors import StateCorruptionError
    from learner.substrate.fsio import atomic_write_text

    root = _resolve_root(root)
    if report.phase not in Phase:
        raise StateCorruptionError(
            f"unknown phase {report.phase!r}; valid phases: {', '.join(p.value for p in Phase)}"
        )
    yaml_path = _status_yaml_path(report.project_id, root)
    data = {
        "project_id": report.project_id,
        "phase": report.phase.value,
        "implementations": {
            lang: {"status": "done" if present else "missing"}
            for lang, present in report.implementations.items()
        },
        "benchmark": {"all_pass": report.benchmark_all_pass},
    }
    text = yaml.dump(
        data,
        Dumper=_NoAliasDumper,
        sort_keys=False,
        allow_unicode=True,
        width=100,
    )
    atomic_write_text(yaml_path, text)
    return yaml_path


def record_verdict(
    project_id: str,
    verdict: VerifierVerdict,
    *,
    root: Path | str | None = None,
) -> Path:
    """Append one verdict record to ``evidence.ndjson`` (append-only audit).

    The timestamp is UTC ISO-8601. The last non-empty line wins on read.
    """
    root = _resolve_root(root)
    ndjson_path = _evidence_ndjson_path(project_id, root)
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "producer": "verifier",
        "context_isolated": verdict.context_isolated,
        "mutation_score": verdict.mutation_score,
        "coverage_core": verdict.coverage_core,
        "verdict": verdict.verdict,
        "source": verdict.source,
    }
    ndjson_path.parent.mkdir(parents=True, exist_ok=True)
    with open(ndjson_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
    return ndjson_path


def check_evidence(
    evidence_path: str | Path,
    *,
    label: str = "",
    root: Path | str | None = None,
) -> list[str]:
    """Return labelled violations for an evidence file (``[]`` on pass).

    Shape detection — no caller branches on unit kind:

    - **Curriculum shape** (file has a ``verifier`` block): enforce
      ``verdict == "PASS"``, ``mutation_score >= 0.65``,
      ``coverage_core >= 0.80``, ``context_isolated is True``.
    - **Game shape** (file has a ``pass`` field, no ``verifier``): require a
      recognized empirical rubric. A producer-owned ``{"pass": true}`` claim
      is never sufficient evidence by itself.

    Never raises on read — missing/unparseable files yield a labelled error.
    """
    root = _resolve_root(root)
    prefix = f"{label}.evidence_file" if label else "evidence_file"
    from engines.openclaw.errors import StateCorruptionError

    try:
        resolved = _resolve_contained(Path(evidence_path), root)
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

    verified_pass, verification_errors = independently_verified_pass(raw)
    if verified_pass is True:
        return []
    if verification_errors:
        if raw.get("pass") is True:
            verification_errors.extend(
                "claimed-versus-verified disagreement: " + detail
                for detail in game_metric_violations(raw)
            )
        return [f"{prefix} {detail} ({evidence_path!r})" for detail in verification_errors]
    if raw.get("pass") is True:
        disagreements = game_metric_violations(raw) or ["empirical rubric did not pass"]
        return [
            f"{prefix} claimed-versus-verified disagreement: {detail} "
            f"({evidence_path!r})"
            for detail in disagreements
        ]
    if verified_pass is False:
        return [f"{prefix} independently verified evidence did not pass ({evidence_path!r})"]
    return [f"{prefix} evidence pass=false ({evidence_path!r})"]


def passes_gate(
    evidence_path: str | Path,
    *,
    root: Path | str | None = None,
) -> bool:
    """True if the evidence file passes the gate (shape-detecting)."""
    return len(check_evidence(evidence_path, root=root)) == 0


def game_metric_violations(evidence: dict[str, Any]) -> list[str]:
    metrics = evidence.get("metrics")
    sources = [evidence]
    if isinstance(metrics, dict):
        sources.append(metrics)

    violations: list[str] = []
    for source in sources:
        for name, value in source.items():
            if name in _NONZERO_FAILURE_METRICS or name.endswith("_violations"):
                if isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0:
                    violations.append(f"{name}={value}")
            elif name in _TRUE_FAILURE_METRICS and value is True:
                violations.append(f"{name}=true")
    return violations


def independently_verified_pass(
    evidence: dict[str, Any],
) -> tuple[bool | None, list[str]]:
    """Evaluate evidence without trusting a producer-owned ``pass`` claim.

    This seam is deliberately independent of ``learner.gate`` and
    ``learner.substrate`` so both the transition gate and canonical-state
    validator can enforce exactly the same verifier contract without an import
    cycle.
    """
    verifier = evidence.get("verifier")
    if isinstance(verifier, dict):
        verdict = verifier.get("verdict")
        if verdict == "PASS":
            mutation = verifier.get("mutation_score")
            coverage = verifier.get("coverage_core")
            isolated = verifier.get("context_isolated")
            strict_verdict = VerifierVerdict(
                mutation_score=mutation,
                coverage_core=coverage,
                context_isolated=isolated,
                verdict="PASS",
                source=str(verifier.get("source", "")),
            )
            if strict_verdict.verified_pass:
                return True, []
            errors = ["independent verifier PASS lacks complete gate metrics or thresholds"]
            if not _is_finite_number(mutation):
                errors.append("mutation_score must be a finite number")
            elif mutation < MUTATION_MIN:
                errors.append(f"mutation_score {mutation} < {MUTATION_MIN}")
            if not _is_finite_number(coverage):
                errors.append("coverage_core must be a finite number")
            elif coverage < COVERAGE_MIN:
                errors.append(f"coverage_core {coverage} < {COVERAGE_MIN}")
            if isolated is not True:
                errors.append("context_isolated is not true")
            return None, errors
        if verdict == "FAIL":
            return False, ["independent verifier verdict is 'FAIL', not PASS"]
        return None, ["independent verifier verdict must be PASS or FAIL"]

    metrics = evidence.get("metrics")
    if isinstance(metrics, dict):
        kind = metrics.get("kind")
        if kind == "pixelquest-token-bucket":
            return (
                _numeric(metrics, "good_admits") >= 8
                and _numeric(metrics, "abusive_admitted") == 0
                and _false(metrics, "overheated")
                and not game_metric_violations(evidence),
                [],
            )
        if kind == "pixelquest-route-health":
            return (
                _numeric(metrics, "routed") > 0
                and _numeric(metrics, "bad_routes") == 0
                and _numeric(metrics, "good_rejected") == 0
                and _false(metrics, "overheated"),
                [],
            )
        if kind == "pixelquest-policy-gate":
            return (
                _numeric(metrics, "allowed") > 0
                and _numeric(metrics, "policy_leaks") == 0
                and _numeric(metrics, "false_denies") == 0
                and _false(metrics, "overheated"),
                [],
            )
        if kind == "pixelquest-sequence-flow":
            return (
                _numeric(metrics, "advanced") > 0
                and _numeric(metrics, "skipped_required") == 0
                and _numeric(metrics, "guards_missed") == 0
                and _false(metrics, "overheated"),
                [],
            )
        if kind == "pixelquest-task-queue":
            return (
                _numeric(metrics, "processed") >= 8
                and _numeric(metrics, "poison_retried") <= 3
                and _numeric(metrics, "legit_retried") == 0
                and _numeric(metrics, "backpressure_peak") <= 4
                and _false(metrics, "overheated"),
                [],
            )

    if evidence.get("game") == "GATEKEEPER":
        good_admits = evidence.get("good_admits")
        if isinstance(good_admits, (int, float)) and not isinstance(good_admits, bool):
            return good_admits >= 8 and not game_metric_violations(evidence), []

    return None, [
        "producer pass has no independent verifier verdict or recognized empirical rubric"
    ]


def _numeric(source: dict[str, Any], field: str) -> float:
    value = source.get(field)
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return float("nan")
    return float(value)


def _false(source: dict[str, Any], field: str) -> bool:
    return source.get(field) is False


def load_verdict(
    project_id: str,
    *,
    root: Path | str | None = None,
) -> VerifierVerdict | None:
    """Return the latest verdict for a challenge, or ``None`` if unrecorded."""
    root = _resolve_root(root)
    verdict = _read_latest_verdict(project_id, root)
    if verdict.verdict == "UNKNOWN":
        return None
    return verdict


def statuses(*, root: Path | str | None = None) -> list[ChallengeStatus]:
    """Return typed status for all challenges, sorted by project_id."""
    root = _resolve_root(root)
    curriculum = root / "curriculum"
    if not curriculum.is_dir():
        return []
    project_ids = sorted(
        d.name for d in curriculum.iterdir() if d.is_dir() and re.match(r"^\d{2}_", d.name)
    )
    results: list[ChallengeStatus] = []
    for pid in project_ids:
        ev = inspect(pid, root=root)
        results.append(
            ChallengeStatus(
                project_id=pid,
                phase=ev.phase,
                passed=ev.verdict.verified_pass,
                attempt_present=ev.attempt_present,
            )
        )
    return results


__all__ = [
    "Phase",
    "VerifierVerdict",
    "ArtifactRef",
    "ChallengeEvidence",
    "ChallengeStatus",
    "MUTATION_MIN",
    "COVERAGE_MIN",
    "inspect",
    "commit",
    "record_verdict",
    "statuses",
    "passes_gate",
    "check_evidence",
    "independently_verified_pass",
    "game_metric_violations",
    "load_verdict",
]
