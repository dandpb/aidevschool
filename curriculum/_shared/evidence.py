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

import hashlib
import json
import re
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any

import yaml

from learner.gate.evidence_io import (
    bound_evidence_violations,
    canonical_evidence_digest,
)
from learner.gate.security import GateSecurityError
from learner.gate.standards import (
    VerifierVerdict,
    challenge_gate_blockers,
    verdict_passed,
)
from learner.gate.verifier_receipt import load_verifier_receipt
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

_PHASE_RE = re.compile(r"\*{0,2}phase:\*{0,2}\s*`?([\w-]+)`?", re.IGNORECASE)


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


def _load_learning_state(root: Path) -> dict[str, Any]:
    state_path = root / "learner" / "learning_state.yaml"
    if not state_path.is_file():
        return {}
    try:
        data = yaml.safe_load(state_path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError):
        return {}
    return data if isinstance(data, dict) else {}


def _file_exists_nonempty(rel_path: Any, root: Path) -> bool:
    if not isinstance(rel_path, str) or not rel_path.strip():
        return False
    try:
        resolved = resolve_contained(Path(rel_path), root)
        return resolved.is_file() and resolved.stat().st_size > 0
    except (StateCorruptionError, OSError):
        return False


def _project_units_in_state(project_id: str, root: Path) -> list[dict[str, Any]]:
    state = _load_learning_state(root)
    units: list[dict[str, Any]] = []
    for item in state.get("units_log") or []:
        if isinstance(item, dict) and item.get("project") == project_id:
            units.append(item)
    active = state.get("active_unit")
    if isinstance(active, dict) and active.get("project") == project_id:
        units.append(active)
    return units


def _attempt_in_canonical_state(project_id: str, root: Path) -> bool:
    return any(
        _file_exists_nonempty(unit.get("attempt_file"), root)
        for unit in _project_units_in_state(project_id, root)
    )


def _last_gate_review(unit: dict[str, Any]) -> dict[str, Any] | None:
    reviews = unit.get("reviews")
    if not isinstance(reviews, list):
        return None
    for review in reversed(reviews):
        if isinstance(review, dict) and review.get("event") == "gate":
            return review
    return None


def _is_sha256_hex(value: Any) -> bool:
    return (
        isinstance(value, str)
        and len(value) == 64
        and all(character in "0123456789abcdef" for character in value)
    )


def _attempt_file_digest(rel_path: Path, root: Path) -> str | None:
    """sha256 of a root-contained file's bytes; None when unreadable/empty."""
    if rel_path.is_absolute():
        return None
    try:
        resolved = resolve_contained(rel_path, root)
        if not resolved.is_file() or resolved.stat().st_size == 0:
            return None
        return hashlib.sha256(resolved.read_bytes()).hexdigest()
    except (StateCorruptionError, OSError):
        return None


def _attempt_identity_violations(gate: dict[str, Any], root: Path) -> list[str]:
    """The gate review must still bind the exact attempt file it graded."""
    attempt_id = gate.get("evidence_attempt_id")
    if not isinstance(attempt_id, str) or not attempt_id.strip():
        return ["last gate review has no attempt id"]
    if not _is_sha256_hex(gate.get("evidence_attempt_digest")):
        return ["last gate review has no attempt digest"]
    actual = _attempt_file_digest(Path(attempt_id), root)
    if actual is None or actual != gate["evidence_attempt_digest"]:
        return ["gate-bound attempt file is missing, unreadable, or changed"]
    return []


def _receipt_for_digest(digest: str, root: Path) -> VerifierVerdict | None:
    """Find the separate verifier receipt bound to ``digest`` (by digest, not
    by source label — source is not unique across receipts).

    Fail-closed on ambiguity and malformed input (static review 6239895063,
    AID-5002): every receipt matching the digest must agree on verdict and
    metrics — a PASS hiding a contradictory FAIL for the same digest is not
    evidence. Malformed receipts (unhashable verdict, huge ints, bad UTF-8)
    are skipped, never fatal to ``inspect()``.
    """
    receipts_dir = root / "learner" / "verifier_receipts"
    if not receipts_dir.is_dir():
        return None
    matches: list[VerifierReceipt] = []
    for path in sorted(receipts_dir.glob("*.json")):
        try:
            receipt = load_verifier_receipt(path, root)
        except (
            GateSecurityError,
            OSError,
            ValueError,
            TypeError,
            OverflowError,
        ):
            continue
        if receipt.evidence_digest != digest:
            continue
        matches.append(receipt)
    if not matches:
        return None
    distinct = {
        (r.verdict, r.mutation_score, r.coverage_core, r.context_isolated)
        for r in matches
    }
    if len(distinct) != 1:
        return None
    receipt = matches[0]
    return VerifierVerdict(
        mutation_score=receipt.mutation_score,
        coverage_core=receipt.coverage_core,
        context_isolated=receipt.context_isolated,
        verdict=receipt.verdict,
        source=receipt.source,
    )


def _evidence_binding_violations(
    unit: dict[str, Any], gate: dict[str, Any], root: Path
) -> list[str]:
    """The unit's evidence file must still match the gate-bound digest."""
    evidence_file = unit.get("evidence_file")
    if not _file_exists_nonempty(evidence_file, root):
        return ["unit evidence_file is missing or empty"]
    try:
        return bound_evidence_violations(
            str(evidence_file), gate["evidence_digest"], root
        )
    except (OSError, ValueError):
        # ValueError covers undecodable bytes: an unreadable evidence file is
        # a closed gate, not a crash (static review 6239895063, AID-5002).
        return ["unit evidence_file is unreadable"]


def _bound_evidence_record(
    evidence_file: Any, digest: Any, root: Path
) -> dict[str, Any] | None:
    """The producer record the gate graded, or None when it cannot be
    established (missing, undecodable, unparseable, digest-missing)."""
    if not isinstance(evidence_file, str) or not evidence_file.strip():
        return None
    if not _is_sha256_hex(digest):
        return None
    candidate = Path(evidence_file)
    if candidate.is_absolute():
        return None
    try:
        resolved = resolve_contained(candidate, root)
        text = resolved.read_text(encoding="utf-8")
    except (StateCorruptionError, OSError, ValueError):
        return None
    records: list[dict[str, Any]] = []
    try:
        raw = json.loads(text)
    except json.JSONDecodeError:
        raw = None
    if isinstance(raw, dict):
        records = [raw]
    else:
        for line in text.splitlines():
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                return None
            if isinstance(record, dict):
                records.append(record)
    matching = [
        record
        for record in records
        if canonical_evidence_digest(record) == digest
    ]
    return matching[-1] if matching else None


def _chain_ownership_violations(
    unit: dict[str, Any],
    gate: dict[str, Any],
    root: Path,
    project_id: str,
) -> list[str]:
    """The intact chain must belong to THIS unit of THIS project.

    A copied, internally consistent chain (evidence file + attempt file +
    receipt + gate review lifted from another unit) must not establish this
    unit's mastery (static review 6239895063 + follow-up 6243873612,
    AID-5002). The digest covers the producer record's identity fields, so
    requiring the digest-matching record to carry this project/unit
    identity closes the copy attack.
    """
    errors: list[str] = []
    attempt_file = unit.get("attempt_file")
    if not isinstance(attempt_file, str) or not attempt_file.strip():
        errors.append("unit has no attempt_file to bind the gate to")
    elif gate.get("evidence_attempt_id") != attempt_file:
        errors.append("gate graded an attempt file other than the unit's own")
    record = _bound_evidence_record(
        unit.get("evidence_file"), gate.get("evidence_digest"), root
    )
    if record is None:
        errors.append("cannot establish which producer record backs the gate")
        return errors
    if record.get("project") != project_id:
        errors.append("evidence record belongs to another project")
    record_unit = record.get("unit_id")
    if not isinstance(record_unit, str) or not record_unit.strip():
        # unit_id is a required producer field (evidence_validator); a
        # digest-bound record without it cannot claim any unit's mastery
        # (follow-up 6243873612, AID-5002).
        errors.append("evidence record has no well-formed unit_id")
    elif record_unit != unit.get("unit_id"):
        errors.append("evidence record belongs to another unit")
    # Identity binding mirrors learner.gate.security.build_receipt exactly:
    # scenario_id, else encounter_id, else legacy:<game> — the gate's
    # evidence_scenario_id is written from that normalization, so the gate
    # review must carry it and it must still match the record.
    record_identity = record.get("scenario_id") or record.get("encounter_id")
    if not isinstance(record_identity, str) or not record_identity.strip():
        record_identity = "legacy:%s" % (record.get("game") or "unknown")
    gate_identity = gate.get("evidence_scenario_id")
    if not isinstance(gate_identity, str) or not gate_identity.strip():
        errors.append("gate review has no normalized scenario identity")
    elif gate_identity != record_identity:
        errors.append("gate scenario does not match the evidence record")
    return errors


def _chain_verdict(
    unit: dict[str, Any],
    gate: dict[str, Any],
    root: Path,
    project_id: str,
) -> VerifierVerdict | None:
    """Verdict when the last gate's verification chain is fully intact.

    None on any broken link (digest, evidence binding, attempt identity,
    chain ownership, receipt, PASS/mastered contradiction) — callers turn
    that into UNKNOWN.
    """
    if not _is_sha256_hex(gate.get("evidence_digest")):
        return None
    if _evidence_binding_violations(unit, gate, root):
        return None
    if _attempt_identity_violations(gate, root):
        return None
    if _chain_ownership_violations(unit, gate, root, project_id):
        return None
    verdict = _receipt_for_digest(gate["evidence_digest"], root)
    if verdict is None:
        return None
    if verdict.verdict == "PASS" and unit.get("mastered") is not True:
        return None
    return verdict


def _verdict_from_canonical_state(project_id: str, root: Path) -> VerifierVerdict:
    """Read the last *independently verified* verdict for a project.

    Fail-closed (AID-5002): the canonical state never mints a verdict. A
    unit's last gate review only counts when the full verification chain is
    intact — the gate-bound evidence digest still matches the unit's
    ``evidence_file`` on disk, the gate-bound attempt identity still matches
    the attempt file, and a separate verifier receipt under
    ``learner/verifier_receipts/`` carries the same digest. Metrics come from
    that receipt, never from thresholds. Anything missing, stale, tampered,
    or contradictory stays ``UNKNOWN``; a real ``FAIL`` receipt with an
    intact chain is preserved.
    """
    unknown = VerifierVerdict(None, None, None, "UNKNOWN")
    state = _load_learning_state(root)
    for unit in reversed(state.get("units_log") or []):
        if not isinstance(unit, dict) or unit.get("project") != project_id:
            continue
        gate = _last_gate_review(unit)
        if gate is None:
            continue
        verdict = _chain_verdict(unit, gate, root, project_id)
        if verdict is None:
            return unknown
        return verdict
    return unknown


def _read_latest_verdict(project_id: str, root: Path) -> VerifierVerdict:
    ndjson_path = _evidence_ndjson_path(project_id, root)
    if not ndjson_path.exists():
        return _verdict_from_canonical_state(project_id, root)
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
    ) or _attempt_in_canonical_state(project_id, root)
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
