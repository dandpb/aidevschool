"""Curator adapter — produces spec."""

from __future__ import annotations

from typing import Any

from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.runner.adapters.base import AdapterResult, BaseAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class CuratorAdapter(BaseAdapter):
    """Curator produces the SPEC_READY event after validating the unit selection."""

    name = "curator"

    def handle(
        self,
        event: Event,
        bus: HermesBus,
        status: PipelineStatus,
        **kwargs: Any,
    ) -> dict[str, Any]:
        project_path = event.payload.get("project_path", status.current_project)
        if not self._artifact_exists(project_path):
            return AdapterResult(
                ok=False,
                reason=f"Project path does not exist: {project_path}",
            ).to_dict()

        spec_path = f"{project_path}/docs/spec.md"
        self._publish_next(
            bus=bus,
            event=event,
            topic="dojo.spec.ready",
            artifact_path=spec_path,
            payload={
                "spec_path": spec_path,
                "adr_path": f"{project_path}/docs/adr.md",
            },
        )
        return AdapterResult(
            ok=True,
            next_topic="dojo.spec.ready",
            reason=f"Curator validated unit and emitted spec.ready for {project_path}",
        ).to_dict()
