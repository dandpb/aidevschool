"""Empirical gate evaluator for Ágora Continuum.

Reference: engines/minimaxDojo/docs/04_empirical_gates.md
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .config import (
    FALLBACK_COVERAGE,
    FALLBACK_MUTATION,
)


@dataclass(frozen=True)
class GateResult:
    verdict: str
    passed: bool
    mutation_score: float
    coverage_core: float
    tests_pass: bool
    lint_clean: bool
    gaps: list[str] = field(default_factory=list)


@dataclass
class EmpiricalGate:
    mutation_threshold: float = FALLBACK_MUTATION
    coverage_threshold: float = FALLBACK_COVERAGE

    def evaluate(
        self,
        mutation_score: float,
        coverage_core: float,
        tests_pass: bool,
        lint_clean: bool,
        anti_patterns: list[str] | None = None,
    ) -> GateResult:
        anti_patterns = anti_patterns or []
        gaps: list[str] = []

        if mutation_score < self.mutation_threshold:
            gaps.append(f"mutation score {mutation_score:.2f} < {self.mutation_threshold:.2f}")

        if coverage_core < self.coverage_threshold:
            gaps.append(f"coverage {coverage_core:.2f} < {self.coverage_threshold:.2f}")

        if not tests_pass:
            gaps.append("tests failing — suite must pass with exit 0")

        if not lint_clean:
            gaps.append("lint errors present — 0 errors, 0 warnings required")

        for pattern in anti_patterns:
            gaps.append(f"anti-pattern detected: {pattern}")

        passed = len(gaps) == 0
        return GateResult(
            verdict="PASS" if passed else "FAIL",
            passed=passed,
            mutation_score=mutation_score,
            coverage_core=coverage_core,
            tests_pass=tests_pass,
            lint_clean=lint_clean,
            gaps=gaps,
        )
