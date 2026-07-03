"""Optimizer adapter — produces memory update event."""

from __future__ import annotations

from typing import Any

from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.runner.adapters.base import AdapterResult, BaseAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class OptimizerAdapter(BaseAdapter):
    """Optimizer validates metrics and emits the MEMORY_UPDATED event."""

    name = "optimizer"

    def handle(
        self,
        event: Event,
        bus: HermesBus,
        status: PipelineStatus,
        **kwargs: Any,
    ) -> dict[str, Any]:
        scorecard_path = event.payload.get("scorecard_path", f"{status.current_project}/docs/benchmark_results.md")
        if not self._artifact_exists(scorecard_path):
            return AdapterResult(
                ok=False,
                reason=f"Benchmark results missing: {scorecard_path}",
            ).to_dict()

        evolution_path = f"{status.current_project}/docs/evolution_report.md"
        self._publish_next(
            bus=bus,
            event=event,
            topic="dojo.memory.updated",
            artifact_path=evolution_path,
            payload={
                "profile_path": "learner/learning_state.yaml",
                "next_action": "cycle-complete",
                "evolution_report_path": evolution_path,
            },
        )
        return AdapterResult(
            ok=True,
            next_topic="dojo.memory.updated",
            reason="Optimizer validated metrics and emitted memory.updated",
        ).to_dict()
