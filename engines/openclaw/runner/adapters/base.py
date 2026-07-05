"""Base adapter interface."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from engines.openclaw.errors import OpenclawError
from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.runner.scheduler import PipelineStatus


@dataclass
class AdapterResult:
    """Result returned by a producer or verifier adapter."""

    ok: bool = True
    next_topic: str | None = None
    verdict: str | None = None  # PASS / FAIL for verifier
    reason: str = ""
    retry_count: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "next_topic": self.next_topic,
            "verdict": self.verdict,
            "reason": self.reason,
            "retry_count": self.retry_count,
            "metadata": self.metadata,
        }


class BaseAdapter:
    """Base class for OpenClaw agent adapters."""

    name: str = "base"

    def __init__(self, root: Path | None = None) -> None:
        self.root = root or Path(__file__).resolve().parent.parent.parent.parent.parent

    def handle(
        self,
        event: Event,
        bus: HermesBus,
        status: PipelineStatus,
        **kwargs: Any,
    ) -> dict[str, Any]:
        raise NotImplementedError

    def _publish_next(
        self,
        bus: HermesBus,
        event: Event,
        topic: str,
        artifact_path: str,
        payload: dict[str, Any],
    ) -> None:
        from engines.openclaw.hermes.topics import Topic

        bus.publish(
            topic=Topic(topic),
            cycle_id=event.cycle_id,
            unit_id=event.unit_id,
            artifact_path=artifact_path,
            payload=payload,
        )

    def _artifact_exists(self, path: str) -> bool:
        try:
            target = self.root / path
            if target.is_file():
                return target.stat().st_size > 0
            if target.is_dir():
                return any(target.iterdir())
            return False
        except OSError as exc:
            raise OpenclawError(
                f"Cannot inspect artifact {path} under {self.root}: {exc}"
            ) from exc

    def _artifact_size(self, path: str) -> int:
        try:
            target = self.root / path
            if target.is_file():
                return target.stat().st_size
            return 0
        except OSError as exc:
            raise OpenclawError(
                f"Cannot inspect artifact {path} under {self.root}: {exc}"
            ) from exc

    def _missing(self, paths: list[str]) -> list[str]:
        """Return the subset of ``paths`` that do not exist as artifacts."""
        return [p for p in paths if not self._artifact_exists(p)]


class ProducerAdapter(BaseAdapter):
    """Template method for producer adapters.

    Every producer follows the same flow: check the input artifacts named in
    the event payload, publish the next topic with a phase-specific payload,
    and return an :class:`AdapterResult`. That flow lives here exactly once;
    subclasses declare ``next_topic`` and implement the three hooks.
    """

    next_topic: str = ""

    def handle(
        self,
        event: Event,
        bus: HermesBus,
        status: PipelineStatus,
        **kwargs: Any,
    ) -> dict[str, Any]:
        failure = self._check_inputs(event, status)
        if failure:
            return AdapterResult(ok=False, reason=failure).to_dict()

        artifact_path, payload = self._build_output(event, status)
        self._publish_next(
            bus=bus,
            event=event,
            topic=self.next_topic,
            artifact_path=artifact_path,
            payload=payload,
        )
        return AdapterResult(
            ok=True,
            next_topic=self.next_topic,
            reason=self._success_reason(event, status),
        ).to_dict()

    def _check_inputs(self, event: Event, status: PipelineStatus) -> str:
        """Return a failure reason, or an empty string when inputs are OK."""
        raise NotImplementedError

    def _build_output(
        self, event: Event, status: PipelineStatus
    ) -> tuple[str, dict[str, Any]]:
        """Return ``(artifact_path, payload)`` for the next-topic event."""
        raise NotImplementedError

    def _success_reason(self, event: Event, status: PipelineStatus) -> str:
        return f"{self.name} emitted {self.next_topic}"
