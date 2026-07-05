"""Optimizer adapter — produces memory update event."""

from __future__ import annotations

from typing import Any

from engines.openclaw import config as cfg
from engines.openclaw.hermes.bus import Event
from engines.openclaw.hermes.topics import Topic
from engines.openclaw.runner.adapters.base import ProducerAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class OptimizerAdapter(ProducerAdapter):
    """Optimizer validates metrics and emits the MEMORY_UPDATED event."""

    name = "optimizer"
    next_topic = Topic.MEMORY_UPDATED.value

    def _check_inputs(self, event: Event, status: PipelineStatus) -> str:
        scorecard_path = event.payload.get(
            "scorecard_path", cfg.benchmark_results_path(status.current_project)
        )
        if not self._artifact_exists(scorecard_path):
            return f"Benchmark results missing: {scorecard_path}"
        return ""

    def _build_output(
        self, event: Event, status: PipelineStatus
    ) -> tuple[str, dict[str, Any]]:
        evolution_path = cfg.evolution_report_path(status.current_project)
        return evolution_path, {
            "profile_path": cfg.LEARNING_STATE_PATH,
            "next_action": "cycle-complete",
            "evolution_report_path": evolution_path,
        }

    def _success_reason(self, event: Event, status: PipelineStatus) -> str:
        return "Optimizer validated metrics and emitted memory.updated"
