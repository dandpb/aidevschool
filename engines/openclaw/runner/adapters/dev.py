"""Dev adapter — produces implementation-ready event."""

from __future__ import annotations

from typing import Any

from engines.openclaw import config as cfg
from engines.openclaw.hermes.bus import Event
from engines.openclaw.hermes.topics import Topic
from engines.openclaw.runner.adapters.base import ProducerAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class DevAdapter(ProducerAdapter):
    """Dev adapter validates spec and emits the IMPL_READY event."""

    name = "dev"
    next_topic = Topic.IMPL_READY.value

    LANGUAGES = cfg.LANGUAGES

    def _impl_paths(self, status: PipelineStatus) -> list[str]:
        return [cfg.impl_path(status.current_project, lang) for lang in self.LANGUAGES]

    def _check_inputs(self, event: Event, status: PipelineStatus) -> str:
        spec_path = event.payload.get("spec_path", cfg.spec_path(status.current_project))
        if not self._artifact_exists(spec_path):
            return f"Spec missing: {spec_path}"
        missing = self._missing(self._impl_paths(status))
        if missing:
            return f"Implementation directories missing: {missing}"
        return ""

    def _build_output(
        self, event: Event, status: PipelineStatus
    ) -> tuple[str, dict[str, Any]]:
        impl_paths = self._impl_paths(status)
        return impl_paths[0], {
            "implementation_paths": impl_paths,
            "test_command": "run-tests",
        }

    def _success_reason(self, event: Event, status: PipelineStatus) -> str:
        return f"Dev validated spec and {len(self.LANGUAGES)} implementations"
