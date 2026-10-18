"""Central configuration for the OpenClaw checklist runner."""

from dataclasses import dataclass


@dataclass(frozen=True)
class OpenclawConfig:
    min_spec_size: int = 100
    min_review_size: int = 100
    min_benchmark_size: int = 50
    min_evolution_size: int = 100


DEFAULT_CONFIG = OpenclawConfig()
LANGUAGES: tuple[str, ...] = ("go", "rust", "node")
POLYGLOT_PROJECTS: frozenset[str] = frozenset({"curriculum/01_rate_limiter", "01_rate_limiter"})
DEFAULT_PROJECT = "curriculum/01_rate_limiter"


def project_languages(project: str) -> tuple[str, ...]:
    """Return required implementation languages for a project.

    Project 01 retains the original polyglot (Go/Rust/Node) track; projects
    02–18 are Node-only per commit 1b0a3090.
    """
    if project in POLYGLOT_PROJECTS or project.endswith("/01_rate_limiter"):
        return LANGUAGES
    return ("node",)


def spec_path(project: str) -> str:
    return f"{project}/docs/spec.md"


def impl_path(project: str, lang: str) -> str:
    return f"{project}/{lang}-impl"


def code_review_path(project: str) -> str:
    return f"{project}/docs/code_review.md"


def benchmark_results_path(project: str) -> str:
    return f"{project}/docs/benchmark_results.md"


def evolution_report_path(project: str) -> str:
    return f"{project}/docs/evolution_report.md"
