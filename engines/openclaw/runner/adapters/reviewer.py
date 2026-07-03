"""Reviewer adapter — produces code review event."""

from __future__ import annotations

from typing import Any

from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.runner.adapters.base import AdapterResult, BaseAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class ReviewerAdapter(BaseAdapter):
    """Reviewer validates implementations and emits the REVIEW_READY event."""

    name = "reviewer"

    def handle(
        self,
        event: Event,
        bus: HermesBus,
        status: PipelineStatus,
        **kwargs: Any,
    ) -> dict[str, Any]:
        impl_paths = event.payload.get("implementation_paths", [])
        missing = [p for p in impl_paths if not self._artifact_exists(p)]
        if missing:
            return AdapterResult(
                ok=False,
                reason=f"Implementation paths missing: {missing}",
            ).to_dict()

        review_path = f"{status.current_project}/docs/code_review.md"
        self._publish_next(
            bus=bus,
            event=event,
            topic="dojo.review.ready",
            artifact_path=review_path,
            payload={
                "findings_path": review_path,
                "learning_notes_path": f"{status.current_project}/docs/learning_notes.md",
                "quiz_path": f"{status.current_project}/docs/quiz.md",
            },
        )
        return AdapterResult(
            ok=True,
            next_topic="dojo.review.ready",
            reason="Reviewer validated implementations and emitted review.ready",
        ).to_dict()
