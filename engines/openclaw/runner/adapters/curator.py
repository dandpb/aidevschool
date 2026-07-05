"""Curator adapter — produces spec."""

from __future__ import annotations

from typing import Any

from engines.openclaw import config as cfg
from engines.openclaw.hermes.bus import Event
from engines.openclaw.hermes.topics import Topic
from engines.openclaw.runner.adapters.base import ProducerAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class CuratorAdapter(ProducerAdapter):
    """Curator produces the SPEC_READY event after validating the unit selection."""

    name = "curator"
    next_topic = Topic.SPEC_READY.value

    def _project_path(self, event: Event, status: PipelineStatus) -> str:
        return event.payload.get("project_path", status.current_project)

    def _check_inputs(self, event: Event, status: PipelineStatus) -> str:
        project_path = self._project_path(event, status)
        if not self._artifact_exists(project_path):
            return f"Project path does not exist: {project_path}"
        return ""

    def _build_output(
        self, event: Event, status: PipelineStatus
    ) -> tuple[str, dict[str, Any]]:
        project_path = self._project_path(event, status)
        spec_path = cfg.spec_path(project_path)
        return spec_path, {
            "spec_path": spec_path,
            "adr_path": cfg.adr_path(project_path),
        }

    def _success_reason(self, event: Event, status: PipelineStatus) -> str:
        project_path = self._project_path(event, status)
        return f"Curator validated unit and emitted spec.ready for {project_path}"
