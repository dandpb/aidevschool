"""Central configuration for the OpenClaw tracer-bullet runner.

Every tunable threshold and every shared artifact-path convention lives
here, so the scheduler, the adapters, and the verifier can never drift
apart. Path helpers return strings relative to the ecosystem root (the
directory that contains ``curriculum/`` and ``learner/``).
"""

from __future__ import annotations

from dataclasses import dataclass

from engines.openclaw.hermes.topics import Topic


@dataclass(frozen=True)
class OpenclawConfig:
    """Tunable thresholds for the runner. See each field for its rationale."""

    min_spec_size: int = 100
    """Minimum ``docs/spec.md`` size in bytes. Below this a spec cannot
    plausibly describe behaviour, constraints, and acceptance criteria, so
    the verifier fails the ``spec`` phase."""

    min_review_size: int = 100
    """Minimum ``docs/code_review.md`` size in bytes. Smaller files are
    placeholder reviews with no findings, so the ``review`` phase fails."""

    min_benchmark_size: int = 50
    """Minimum ``docs/benchmark_results.md`` size in bytes. Lower than the
    prose thresholds because a single genuine metrics-table row is already
    meaningful evidence."""

    min_evolution_size: int = 100
    """Minimum ``docs/evolution_report.md`` size in bytes for the
    ``optimize`` phase — an evolution report must at least state what
    changed and why."""

    verifier_retry_limit: int = 3
    """How many verifier FAILs on the same topic before the scheduler
    records a blocker and halts, instead of re-running the producer
    forever. Three attempts is enough to rule out transient artifacts
    without burning cycles on a structurally broken phase."""


DEFAULT_CONFIG = OpenclawConfig()

# Languages every unit must be implemented in (dev-phase gate).
LANGUAGES: tuple[str, ...] = ("go", "rust", "node")

# Fallback project when pipeline_status.md carries no current_project.
DEFAULT_PROJECT = "curriculum/01_rate_limiter"

# Learner substrate paths (relative to the ecosystem root).
JOURNAL_PATH = "learner/journal.md"
LEARNING_STATE_PATH = "learner/learning_state.yaml"


def spec_path(project: str) -> str:
    """Spec produced by the curator phase."""
    return f"{project}/docs/spec.md"


def adr_path(project: str) -> str:
    """Architecture decision record accompanying the spec."""
    return f"{project}/docs/adr.md"


def impl_path(project: str, lang: str) -> str:
    """Implementation directory for one language."""
    return f"{project}/{lang}-impl"


def code_review_path(project: str) -> str:
    """Findings document produced by the reviewer phase."""
    return f"{project}/docs/code_review.md"


def benchmark_results_path(project: str) -> str:
    """Scorecard produced by the benchmarker phase."""
    return f"{project}/docs/benchmark_results.md"


def evolution_report_path(project: str) -> str:
    """Report produced by the optimizer phase."""
    return f"{project}/docs/evolution_report.md"


def artifact_path_for_topic(topic: Topic, project: str) -> str:
    """Single source of truth for the topic → artifact-path mapping.

    Used by the scheduler when it self-publishes producer events and kept
    consistent with what each adapter publishes for the same topic.
    """
    mapping = {
        Topic.UNIT_SELECTED: project,
        Topic.SPEC_READY: spec_path(project),
        Topic.IMPL_READY: impl_path(project, LANGUAGES[0]),
        Topic.REVIEW_READY: code_review_path(project),
        Topic.METRICS_READY: benchmark_results_path(project),
        Topic.MEMORY_UPDATED: JOURNAL_PATH,
    }
    return mapping.get(topic, project)
