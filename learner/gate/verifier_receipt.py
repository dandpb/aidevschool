"""Independent verifier-receipt boundary for learner gate evidence."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from curriculum._shared.evidence import COVERAGE_MIN, MUTATION_MIN
from learner.gate.evidence_io import canonical_evidence_digest
from learner.gate.security import GateSecurityError


@dataclass(frozen=True, slots=True)
class VerifierReceipt:
    verdict: str
    context_isolated: bool
    mutation_score: float
    coverage_core: float
    source: str
    evidence_digest: str

    @property
    def passed(self) -> bool:
        return self.verdict == "PASS"


def load_verifier_receipt(path: str | Path, root: Path) -> VerifierReceipt:
    resolved = _secure_receipt_path(path, root)
    try:
        raw = json.loads(resolved.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise GateSecurityError(
            f"verifier receipt is not parseable JSON: {exc.msg} at line {exc.lineno}"
        ) from exc
    if not isinstance(raw, dict):
        raise GateSecurityError("verifier receipt must be a JSON object")
    return _parse_receipt(raw)


def receipt_violations(
    receipt: VerifierReceipt, evidence: dict[str, Any]
) -> list[str]:
    errors: list[str] = []
    expected_digest = canonical_evidence_digest(evidence)
    if receipt.evidence_digest != expected_digest:
        errors.append(
            "verifier receipt evidence_digest does not match canonical producer evidence"
        )
    if receipt.verdict == "PASS":
        if receipt.mutation_score < MUTATION_MIN:
            errors.append(
                f"verifier receipt mutation_score {receipt.mutation_score} < {MUTATION_MIN}"
            )
        if receipt.coverage_core < COVERAGE_MIN:
            errors.append(
                f"verifier receipt coverage_core {receipt.coverage_core} < {COVERAGE_MIN}"
            )
    if receipt.context_isolated is not True:
        errors.append("verifier receipt context_isolated is not true")
    return errors


def _secure_receipt_path(path: str | Path, root: Path) -> Path:
    resolved_root = root.resolve()
    receipts_root = resolved_root / "learner" / "verifier_receipts"
    candidate = Path(path)
    candidate = candidate if candidate.is_absolute() else resolved_root / candidate
    try:
        relative = candidate.relative_to(resolved_root)
    except ValueError as exc:
        raise GateSecurityError(
            "verifier receipt must resolve inside learner/verifier_receipts"
        ) from exc
    current = resolved_root
    for part in relative.parts:
        current /= part
        if current.is_symlink():
            raise GateSecurityError("verifier receipt path must not traverse a symlink")
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(receipts_root)
    except FileNotFoundError as exc:
        raise GateSecurityError(f"verifier receipt not found: {path}") from exc
    except ValueError as exc:
        raise GateSecurityError(
            "verifier receipt must be inside learner/verifier_receipts"
        ) from exc
    if not resolved.is_file():
        raise GateSecurityError("verifier receipt must be a regular file")
    return resolved


def _parse_receipt(raw: dict[str, Any]) -> VerifierReceipt:
    verdict = raw.get("verdict")
    if verdict not in {"PASS", "FAIL"}:
        raise GateSecurityError("verifier receipt verdict must be PASS or FAIL")
    context_isolated = raw.get("context_isolated")
    if not isinstance(context_isolated, bool):
        raise GateSecurityError("verifier receipt context_isolated must be a boolean")
    mutation_score = _score(raw.get("mutation_score"), "mutation_score")
    coverage_core = _score(raw.get("coverage_core"), "coverage_core")
    source = raw.get("source")
    if not isinstance(source, str) or not source.strip():
        raise GateSecurityError("verifier receipt source must be a non-empty string")
    evidence_digest = raw.get("evidence_digest")
    if (
        not isinstance(evidence_digest, str)
        or len(evidence_digest) != 64
        or any(character not in "0123456789abcdef" for character in evidence_digest)
    ):
        raise GateSecurityError(
            "verifier receipt evidence_digest must be a lowercase SHA-256 digest"
        )
    return VerifierReceipt(
        verdict=verdict,
        context_isolated=context_isolated,
        mutation_score=mutation_score,
        coverage_core=coverage_core,
        source=source,
        evidence_digest=evidence_digest,
    )


def _score(value: Any, field_name: str) -> float:
    if (
        not isinstance(value, (int, float))
        or isinstance(value, bool)
        or not math.isfinite(value)
    ):
        raise GateSecurityError(
            f"verifier receipt {field_name} must be a finite number"
        )
    return float(value)
