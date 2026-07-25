"""Immutable phase table derived from the engine slash-command contracts."""

from types import MappingProxyType

from .models import PhasePlan, PipelinePhase


PHASE_PLANS = MappingProxyType(
    {
        PipelinePhase.SPEC: PhasePlan(
            "spec", "/devschool-spec", "curator", "verifier",
            PipelinePhase.SPEC, PipelinePhase.SPEC_DONE,
        ),
        PipelinePhase.SPEC_DONE: PhasePlan(
            "impl", "/devschool-implement", "dev-node", "verifier",
            PipelinePhase.SPEC_DONE, PipelinePhase.IMPL_DONE,
        ),
        PipelinePhase.IMPL_DONE: PhasePlan(
            "review", "/devschool-review", "reviewer", "verifier",
            PipelinePhase.IMPL_DONE, PipelinePhase.REVIEW_DONE,
        ),
        PipelinePhase.REVIEW_DONE: PhasePlan(
            "benchmark", "/devschool-benchmark", "benchmarker", "verifier",
            PipelinePhase.REVIEW_DONE, PipelinePhase.BENCHMARK_DONE,
        ),
        PipelinePhase.BENCHMARK_DONE: PhasePlan(
            "optimize", "/devschool-optimize", "optimizer", "verifier",
            PipelinePhase.BENCHMARK_DONE, PipelinePhase.CYCLE_COMPLETE,
        ),
    }
)

NEXT_AWAITING = MappingProxyType({
    PipelinePhase.SPEC: "implementation",
    PipelinePhase.SPEC_DONE: "review",
    PipelinePhase.IMPL_DONE: "benchmark",
    PipelinePhase.REVIEW_DONE: "optimization",
    PipelinePhase.BENCHMARK_DONE: "learning-evidence",
})

ALLOWED_COMMANDS = frozenset(plan.command for plan in PHASE_PLANS.values())
ALLOWED_ROLES = frozenset(
    role for plan in PHASE_PLANS.values() for role in (plan.producer_role, plan.verifier_role)
)
