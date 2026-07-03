"""Dev adapter — produces implementation-ready event."""

from __future__ import annotations

from typing import Any

from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.runner.adapters.base import AdapterResult, BaseAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class DevAdapter(BaseAdapter):
    """Dev adapter validates spec and emits the IMPL_READY event."""

    name = "dev"

    LANGUAGES = ("go", "rust", "node")

    def handle(
        self,
        event: Event,
        bus: HermesBus,
        status: PipelineStatus,
        **kwargs: Any,
    ) -> dict[str, Any]:
        spec_path = event.payload.get("spec_path", f"{status.current_project}/docs/spec.md")
        if not self._artifact_exists(spec_path):
            return AdapterResult(
                ok=False,
                reason=f"Spec missing: {spec_path}",
            ).to_dict()

        project_path = status.current_project
        impl_paths = [f"{project_path}/{lang}-impl" for lang in self.LANGUAGES]
        missing = [p for p in impl_paths if not self._artifact_exists(p)]
        if missing:
            return AdapterResult(
                ok=False,
                reason=f"Implementation directories missing: {missing}",
            ).to_dict()

        self._publish_next(
            bus=bus,
            event=event,
            topic="dojo.impl.ready",
            artifact_path=impl_paths[0],
            payload={
                "implementation_paths": impl_paths,
                "test_command": "run-tests",
            },
        )
        return AdapterResult(
            ok=True,
            next_topic="dojo.impl.ready",
            reason=f"Dev validated spec and {len(self.LANGUAGES)} implementations",
        ).to_dict()
