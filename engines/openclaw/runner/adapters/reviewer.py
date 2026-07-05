"""Reviewer adapter — produces code review event."""

from __future__ import annotations

from typing import Any

from engines.openclaw import config as cfg
from engines.openclaw.hermes.bus import Event
from engines.openclaw.hermes.topics import Topic
from engines.openclaw.runner.adapters.base import ProducerAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class ReviewerAdapter(ProducerAdapter):
    """Reviewer validates implementations and emits the REVIEW_READY event."""

    name = "reviewer"
    next_topic = Topic.REVIEW_READY.value

    def _check_inputs(self, event: Event, status: PipelineStatus) -> str:
        missing = self._missing(event.payload.get("implementation_paths", []))
        if missing:
            return f"Implementation paths missing: {missing}"
        return ""

    def _build_output(
        self, event: Event, status: PipelineStatus
    ) -> tuple[str, dict[str, Any]]:
        review_path = cfg.code_review_path(status.current_project)
        return review_path, {
            "findings_path": review_path,
            "learning_notes_path": f"{status.current_project}/docs/learning_notes.md",
            "quiz_path": f"{status.current_project}/docs/quiz.md",
        }

    def _success_reason(self, event: Event, status: PipelineStatus) -> str:
        return "Reviewer validated implementations and emitted review.ready"
