"""Curriculum evidence contract: typed challenge evidence behind a small interface.

Deep module (codebase-design): one ``inspect``/``commit`` pair hides phase
detection, artifact discovery, and verdict aggregation. The *judgment* half —
thresholds, rubrics, and the shape-detecting evidence gate — moved to
``learner/gate/standards.py`` (2026-09-13): the rules that decide whether
evidence proves mastery live with the context that owns mastery. This module
keeps identity and discovery; it consumes the judgment through
``learner.gate.standards``.

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
import re
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any

import yaml

from learner.gate.standards import (
    VerifierVerdict,
    challenge_gate_blockers,
    verdict_passed,
)
from shared.errors import StateCorruptionError
from shared.fsio import atomic_write_text, resolve_contained
from shared.time import utc_now_iso

ROOT = Path(__file__).resolve().parent.parent.parent

LANGUAGES: tuple[str, ...] = ("go", "rust", "node")

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
    (attempt-before-solution + verifier PASS), delegated to
    ``learner.gate.standards.challenge_gate_blockers`` so the bar itself stays
    with the judgment that owns it.
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
        return challenge_gate_blockers(self.attempt_present, self.verdict)


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


def _project_dir(base: Path, project_id: str) -> Path:
    project_path = Path(project_id)
    if project_path.is_absolute() or len(project_path.parts) != 1 or project_id in {"", ".", ".."}:
        raise StateCorruptionError(f"invalid project_id {project_id!r}: expected one slug")
    return resolve_contained(project_path, base)


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
    yaml_path = _status_yaml_path(project_id, root)
    if yaml_path.exists():
        try:
            data = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
        except (OSError, yaml.YAMLError) as exc:
            raise StateCorruptionError(
                f"Cannot read status YAML at {yaml_path}: {exc}"
            ) from exc
        if not isinstance(data, dict):
            raise StateCorruptionError(f"status YAML at {yaml_path} must be a mapping")
        raw_phase = data.get("phase", "spec")
        try:
            return Phase(str(raw_phase))
        except ValueError as exc:
            raise StateCorruptionError(
                f"unknown phase {raw_phase!r} at {yaml_path}; valid phases: "
                + ", ".join(p.value for p in Phase)
            ) from exc
    md_path = _status_md_path(project_id, root)
    if md_path.exists():
        match = _PHASE_RE.search(md_path.read_text(encoding="utf-8"))
        if match:
            try:
                return Phase(match.group(1))
            except ValueError as exc:
                raise StateCorruptionError(
                    f"unknown phase {match.group(1)!r} in {md_path}"
                ) from exc
    return Phase.SPEC


# ---------------------------------------------------------------------------
# Internal: artifact + implementation discovery
# ---------------------------------------------------------------------------


def _discover_artifacts(project_id: str, root: Path) -> tuple[ArtifactRef, ...]:
    challenge = _challenge_dir(project_id, root)
    refs = []
    for name, rel in _ARTIFACT_PATHS:
        path = challenge / rel
        refs.append(
            ArtifactRef(
                name=name,
                rel_path=rel,
                exists=path.exists(),
                bytes=path.stat().st_size if path.exists() else 0,
            )
        )
    return tuple(refs)


def _discover_implementations(project_id: str, root: Path) -> dict[str, bool]:
    challenge = _challenge_dir(project_id, root)
    result = {}
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
    benchmark = data.get("benchmark")
    if isinstance(benchmark, dict) and isinstance(benchmark.get("all_pass"), bool):
        return benchmark["all_pass"]
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
        "ts": utc_now_iso(),
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
                passed=verdict_passed(ev.verdict),
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
    "inspect",
    "commit",
    "record_verdict",
    "statuses",
    "load_verdict",
]
