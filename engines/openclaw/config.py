"""Central configuration for the OpenClaw checklist runner."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class OpenclawConfig:
    min_spec_size: int = 100
    min_review_size: int = 100
    min_benchmark_size: int = 50
    min_evolution_size: int = 100
    verifier_retry_limit: int = 3  # unused in checklist; kept for config stability


DEFAULT_CONFIG = OpenclawConfig()
LANGUAGES: tuple[str, ...] = ("go", "rust", "node")
DEFAULT_PROJECT = "curriculum/01_rate_limiter"
JOURNAL_PATH = "learner/journal.md"
LEARNING_STATE_PATH = "learner/learning_state.yaml"


def spec_path(project: str) -> str:
    return f"{project}/docs/spec.md"


def adr_path(project: str) -> str:
    return f"{project}/docs/adr.md"


def impl_path(project: str, lang: str) -> str:
    return f"{project}/{lang}-impl"


def code_review_path(project: str) -> str:
    return f"{project}/docs/code_review.md"


def benchmark_results_path(project: str) -> str:
    return f"{project}/docs/benchmark_results.md"


def evolution_report_path(project: str) -> str:
    return f"{project}/docs/evolution_report.md"
