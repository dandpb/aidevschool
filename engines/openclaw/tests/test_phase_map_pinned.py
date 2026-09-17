"""Pin scheduler._PHASE_MAP: fine-grained scheduler phases -> coarse evidence phases.

The map was a hand-maintained local inside ``Scheduler.step`` with no test
pinning it; it now lives at module level and this test freezes every edge
(task pipeline-write-authority, criterion 7).
"""

from __future__ import annotations

from curriculum._shared.evidence import Phase as EvidencePhase
from engines.openclaw.runner.pipeline_status import Phase
from engines.openclaw.runner.scheduler import _PHASE_MAP


def test_phase_map_pinned() -> None:
    assert _PHASE_MAP == {
        Phase.SPEC: EvidencePhase.SPEC,
        Phase.SPEC_DONE: EvidencePhase.IMPL,
        Phase.IMPL_DONE: EvidencePhase.REVIEW,
        Phase.REVIEW_DONE: EvidencePhase.BENCHMARK,
        Phase.BENCHMARK_DONE: EvidencePhase.OPTIMIZE,
        Phase.CYCLE_COMPLETE: EvidencePhase.CYCLE_COMPLETE,
    }
