"""Security checks and immutable receipts for executable gate evidence."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from curriculum._shared.evidence import (
    independently_verified_pass as independently_verified_pass,
)
from learner.gate.evidence_io import (
    canonical_evidence_digest as canonical_evidence_digest,
)
from learner.substrate.gate import GateEvidenceReceipt


class GateSecurityError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class AttemptIdentity:
    id: str
    digest: str


def parse_aware_timestamp(raw: str) -> datetime:
    parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise GateSecurityError("timestamp must include a timezone offset")
    return parsed


def secure_attempt_path(
    root: Path, declared: str, label: str = "attempt file"
) -> tuple[Path | None, list[str]]:
    root = root.resolve()
    attempts_root = (root / "learner" / "attempts").resolve()
    candidate = Path(declared)
    candidate = candidate if candidate.is_absolute() else root / candidate
    try:
        relative = candidate.relative_to(root)
    except ValueError:
        return None, [f"{label} must resolve under repository root: {declared}"]
    current = root
    for part in relative.parts:
        current /= part
        if current.is_symlink():
            return None, [f"{label} must not traverse a symlink: {declared}"]
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(attempts_root)
    except FileNotFoundError:
        return None, [f"{label} not found: {declared}"]
    except ValueError:
        return None, [f"{label} must be inside learner/attempts: {declared}"]
    if not resolved.is_file():
        return None, [f"{label} is not a regular file: {declared}"]
    return resolved, []


def build_attempt_identity(path: Path, root: Path) -> AttemptIdentity:
    return AttemptIdentity(
        id=path.relative_to(root.resolve()).as_posix(),
        digest=hashlib.sha256(path.read_bytes()).hexdigest(),
    )


def build_receipt(
    evidence: dict[str, Any], attempt: AttemptIdentity, timestamp: str
) -> GateEvidenceReceipt:
    scenario_id = evidence.get("scenario_id") or evidence.get("encounter_id")
    if not isinstance(scenario_id, str) or not scenario_id.strip():
        scenario_id = f"legacy:{evidence.get('game', 'unknown')}"
    digest = canonical_evidence_digest(evidence)
    run_id = evidence.get("run_id")
    if not isinstance(run_id, str) or not run_id.strip():
        run_id = f"sha256:{digest}"
    return GateEvidenceReceipt(
        timestamp=timestamp,
        digest=digest,
        run_id=run_id,
        attempt_id=attempt.id,
        attempt_digest=attempt.digest,
        scenario_id=scenario_id,
    )


def replay_violations(
    receipt: GateEvidenceReceipt,
    units_log: list[dict[str, Any]],
    unit_id: str,
) -> list[str]:
    errors: list[str] = []
    for entry in units_log:
        if entry.get("unit_id") != unit_id:
            continue
        for review in entry.get("reviews") or []:
            if review.get("evidence_digest") == receipt.digest:
                errors.append("evidence digest replay detected; timestamp changes do not renew evidence")
            if (
                review.get("evidence_attempt_id") == receipt.attempt_id
                and review.get("evidence_attempt_digest") == receipt.attempt_digest
                and review.get("evidence_scenario_id") == receipt.scenario_id
            ):
                errors.append(
                    "attempt/scenario replay detected; producer metadata changes do not renew evidence"
                )
            if (
                review.get("evidence_run_id") == receipt.run_id
                and review.get("evidence_digest") not in (None, receipt.digest)
            ):
                errors.append("evidence run_id is immutable and was reused with different payload")
    return errors


def latest_gated_evidence_timestamp(
    units_log: list[dict[str, Any]], unit_id: str
) -> str | None:
    latest: str | None = None
    for entry in units_log:
        if entry.get("unit_id") != unit_id:
            continue
        for review in entry.get("reviews") or []:
            timestamp = review.get("evidence_ts")
            if isinstance(timestamp, str) and (latest is None or timestamp > latest):
                latest = timestamp
    return latest
