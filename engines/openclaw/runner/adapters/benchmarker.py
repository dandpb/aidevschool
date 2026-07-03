"""Benchmarker adapter — produces metrics event."""

from __future__ import annotations

from typing import Any

from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.runner.adapters.base import AdapterResult, BaseAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class BenchmarkerAdapter(BaseAdapter):
    """Benchmarker validates review artifacts and emits the METRICS_READY event."""

    name = "benchmarker"

    def handle(
        self,
        event: Event,
        bus: HermesBus,
        status: PipelineStatus,
        **kwargs: Any,
    ) -> dict[str, Any]:
        findings_path = event.payload.get("findings_path", f"{status.current_project}/docs/code_review.md")
        if not self._artifact_exists(findings_path):
            return AdapterResult(
                ok=False,
                reason=f"Code review missing: {findings_path}",
            ).to_dict()

        benchmark_path = f"{status.current_project}/docs/benchmark_results.md"
        self._publish_next(
            bus=bus,
            event=event,
            topic="dojo.metrics.ready",
            artifact_path=benchmark_path,
            payload={
                "scorecard_path": benchmark_path,
                "benchmark_dir": f"{status.current_project}/benchmarks",
            },
        )
        return AdapterResult(
            ok=True,
            next_topic="dojo.metrics.ready",
            reason="Benchmarker validated review and emitted metrics.ready",
        ).to_dict()
