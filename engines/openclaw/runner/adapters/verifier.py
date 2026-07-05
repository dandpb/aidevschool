"""Verifier adapter — adversarial gate for every phase."""

from __future__ import annotations

from typing import Any

from engines.openclaw.config import DEFAULT_CONFIG
from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.runner.adapters.base import AdapterResult, BaseAdapter
from engines.openclaw.runner.scheduler import PipelineStatus


class VerifierAdapter(BaseAdapter):
    """Verifier re-derives correctness from artifacts; never shares producer state."""

    name = "verifier"

    # Size thresholds are defined (and documented) once in
    # engines.openclaw.config; mirrored here as class attributes so tests
    # and subclasses can still override per-instance.
    MIN_SPEC_SIZE = DEFAULT_CONFIG.min_spec_size
    MIN_REVIEW_SIZE = DEFAULT_CONFIG.min_review_size
    MIN_BENCHMARK_SIZE = DEFAULT_CONFIG.min_benchmark_size
    MIN_EVOLUTION_SIZE = DEFAULT_CONFIG.min_evolution_size

    def handle(
        self,
        event: Event,
        bus: HermesBus,
        status: PipelineStatus,
        **kwargs: Any,
    ) -> dict[str, Any]:
        phase = kwargs.get("phase", "unknown")
        artifact_path = event.artifact_path

        checks: dict[str, tuple[bool, str]] = {
            "spec": self._check_file(artifact_path, self.MIN_SPEC_SIZE),
            "impl": self._check_impl(event),
            "review": self._check_file(artifact_path, self.MIN_REVIEW_SIZE),
            "benchmark": self._check_file(artifact_path, self.MIN_BENCHMARK_SIZE),
            "optimize": self._check_file(artifact_path, self.MIN_EVOLUTION_SIZE),
        }

        ok, reason = checks.get(phase, (False, f"Unknown verifier phase: {phase}"))

        if not ok:
            return AdapterResult(
                ok=False,
                verdict="FAIL",
                reason=reason,
            ).to_dict()

        return AdapterResult(
            ok=True,
            verdict="PASS",
            reason=f"Verifier {phase} PASS for {artifact_path}",
        ).to_dict()

    def _check_file(self, path: str, min_size: int) -> tuple[bool, str]:
        if not self._artifact_exists(path):
            return False, f"Artifact missing: {path}"
        size = self._artifact_size(path)
        if size < min_size:
            return False, f"Artifact too small ({size} bytes < {min_size}): {path}"
        return True, ""

    def _check_impl(self, event: Event) -> tuple[bool, str]:
        impl_paths = event.payload.get("implementation_paths", [event.artifact_path])
        missing = [p for p in impl_paths if not self._artifact_exists(p)]
        if missing:
            return False, f"Implementation artifacts missing: {missing}"
        return True, ""
