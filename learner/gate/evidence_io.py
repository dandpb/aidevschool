from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import Any, TextIO

MAX_EVIDENCE_BYTES = 65_536


class EvidenceParseError(ValueError):
    pass


def read_bounded_evidence(
    stream: TextIO, max_bytes: int = MAX_EVIDENCE_BYTES
) -> dict[str, Any] | None:
    """Single bounded read for every fixed verifier bridge. The browser supplies
    the payload, so its size is never trusted; over-long or unparseable input
    yields None and the caller emits a normal FAIL receipt."""
    try:
        payload = stream.read(max_bytes + 1)
        if len(payload.encode("utf-8")) > max_bytes:
            return None
        raw: Any = json.loads(payload)
    except (json.JSONDecodeError, UnicodeError):
        return None
    return raw if isinstance(raw, dict) else None


def load_evidence(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_evidence_ndjson(path: str | Path) -> list[dict[str, Any]]:
    evidence_path = Path(path)
    records: list[dict[str, Any]] = []
    for lineno, line in enumerate(
        evidence_path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as exc:
            raise EvidenceParseError(
                f"{evidence_path}: line {lineno} is not valid JSON: {exc}"
            ) from exc
        if not isinstance(record, dict):
            raise EvidenceParseError(
                f"{evidence_path}: line {lineno} is not a JSON object"
            )
        records.append(record)
    return records


def select_evidence(
    records: list[dict[str, Any]], active_unit: dict[str, Any]
) -> dict[str, Any] | None:
    matches = [record for record in records if record.get("unit_id") == active_unit.get("id")]
    return matches[-1] if matches else None


def canonical_evidence_digest(evidence: dict[str, Any]) -> str:
    """Hash stable producer-owned semantics, excluding timestamp and verifier claims."""
    stable_payload = _canonical_producer_payload(evidence)
    encoded = json.dumps(stable_payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def bound_evidence_violations(
    evidence_path: str | Path, expected_digest: str, root: Path
) -> list[str]:
    prefix = "evidence_file"
    candidate = Path(evidence_path)
    candidate = candidate if candidate.is_absolute() else root / candidate
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root.resolve())
    except FileNotFoundError:
        return [f"{prefix} points at a missing path: {evidence_path!r}"]
    except ValueError:
        return [f"{prefix} escapes root: {evidence_path!r}"]
    try:
        raw = json.loads(resolved.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        # Pixel EVIDENCE_CONTRACT: NDJSON keeps one record per attempt line
        # (AID-3710 F1) — delegate to the multi-record binding check.
        return _bound_ndjson_record_violations(resolved, expected_digest, evidence_path)
    if not isinstance(raw, dict):
        return [
            f"{prefix} is valid JSON but not an object: {evidence_path!r}"
        ]
    errors: list[str] = []
    if "verifier" in raw:
        errors.append(
            f"{prefix} embeds a producer-controlled 'verifier' block; "
            "use a separate verifier receipt"
        )
    if canonical_evidence_digest(raw) != expected_digest:
        errors.append(
            f"{prefix} does not match the canonical digest recorded by the verifier"
        )
    return errors


def _bound_ndjson_record_violations(
    resolved: Path, expected_digest: str, evidence_path: str | Path
) -> list[str]:
    """Multi-record NDJSON binding (Pixel EVIDENCE_CONTRACT: one record per
    attempt; records for other units may share the file). The gate graded the
    active unit's latest record and the receipt binds that record's canonical
    digest, so the file keeps backing the review while it still contains a
    record matching the verifier-recorded digest (AID-3710 F1: requiring
    receipts must not block legitimate multi-record evidence)."""
    prefix = "evidence_file"
    try:
        records = load_evidence_ndjson(resolved)
    except EvidenceParseError as exc:
        return [
            f"{prefix} is not parseable JSON or NDJSON "
            f"({evidence_path!r}): {exc}"
        ]
    matching = [
        record
        for record in records
        if canonical_evidence_digest(record) == expected_digest
    ]
    if not matching:
        return [
            f"{prefix} does not match the canonical digest recorded by the verifier"
        ]
    if any("verifier" in record for record in matching):
        return [
            f"{prefix} embeds a producer-controlled 'verifier' block; "
            "use a separate verifier receipt"
        ]
    return []


def bound_literacy_evidence_violations(
    evidence_path: str | Path, expected_digest: str, root: Path
) -> list[str]:
    """Bound-check a LiteracyEvidenceRecord against a verifier receipt digest.

    Same contract as ``bound_evidence_violations`` (rejects producer-embedded
    ``verifier`` blocks, rechecks the canonical digest) but uses the literacy
    digest (``literacy_evidence_digest``), which excludes ``timestamp`` rather
    than ``ts`` — the two evidence classes never share a digest function.
    """
    prefix = "evidence_file"
    candidate = Path(evidence_path)
    candidate = candidate if candidate.is_absolute() else root / candidate
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root.resolve())
    except FileNotFoundError:
        return [f"{prefix} points at a missing path: {evidence_path!r}"]
    except ValueError:
        return [f"{prefix} escapes root: {evidence_path!r}"]
    try:
        raw = json.loads(resolved.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [
            f"{prefix} is not parseable JSON ({evidence_path!r}): "
            f"{exc.msg} at line {exc.lineno}"
        ]
    if not isinstance(raw, dict):
        return [f"{prefix} is valid JSON but not an object: {evidence_path!r}"]
    errors: list[str] = []
    if "verifier" in raw:
        errors.append(
            f"{prefix} embeds a producer-controlled 'verifier' block; "
            "use a separate verifier receipt"
        )
    from learner.gate.literacy_verifier import literacy_evidence_digest

    if literacy_evidence_digest(raw) != expected_digest:
        errors.append(
            f"{prefix} does not match the literacy digest recorded by the verifier"
        )
    return errors


def _canonical_producer_payload(evidence: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in evidence.items()
        if key not in {"ts", "verifier"}
    }
