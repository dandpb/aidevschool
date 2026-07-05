"""Benchmarker adapter — produces metrics event."""

from __future__ import annotations

from typing import Any

from engines.openclaw import config as cfg
from engines.openclaw.hermes.bus import Event
from engines.openclaw.hermes.topics import Topic
from engines.openclaw.runner.adapters.base import ProducerAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class BenchmarkerAdapter(ProducerAdapter):
    """Benchmarker validates review artifacts and emits the METRICS_READY event."""

    name = "benchmarker"
    next_topic = Topic.METRICS_READY.value

    def _check_inputs(self, event: Event, status: PipelineStatus) -> str:
        findings_path = event.payload.get(
            "findings_path", cfg.code_review_path(status.current_project)
        )
        if not self._artifact_exists(findings_path):
            return f"Code review missing: {findings_path}"
        return ""

    def _build_output(
        self, event: Event, status: PipelineStatus
    ) -> tuple[str, dict[str, Any]]:
        benchmark_path = cfg.benchmark_results_path(status.current_project)
        return benchmark_path, {
            "scorecard_path": benchmark_path,
            "benchmark_dir": f"{status.current_project}/benchmarks",
        }

    def _success_reason(self, event: Event, status: PipelineStatus) -> str:
        return "Benchmarker validated review and emitted metrics.ready"
