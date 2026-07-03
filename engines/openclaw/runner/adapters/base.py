"""Base adapter interface."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

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
        target = self.root / path
        if target.is_file():
            return target.stat().st_size > 0
        if target.is_dir():
            return any(target.iterdir())
        return False

    def _artifact_size(self, path: str) -> int:
        target = self.root / path
        if target.is_file():
            return target.stat().st_size
        return 0
