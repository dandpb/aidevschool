"""Pure deterministic supervisor decision kernel."""

from .models import (
    Action,
    Decision,
    LearnerState,
    LearningState,
    PipelinePhase,
    PipelineState,
    RuntimeSnapshot,
)
from .plans import PHASE_PLANS


def decide(
    pipeline: PipelineState,
    learner: LearnerState,
    runtime: RuntimeSnapshot = RuntimeSnapshot(),
) -> Decision:
    base = {"project": pipeline.project, "observed_phase": pipeline.phase}
    if runtime.lease_held:
        return Decision(Action.ALREADY_RUNNING, "supervisor lease is held", **base)
    if runtime.pending_request is not None:
        return Decision(Action.ALREADY_RUNNING, "a phase request is already pending", **base)
    if runtime.operational_blocker:
        return Decision(Action.BLOCKED, runtime.operational_blocker, **base)
    if pipeline.blockers:
        return Decision(Action.BLOCKED, "; ".join(pipeline.blockers), **base)
    if pipeline.phase is PipelinePhase.SPEC_DONE and learner.implementation_blocked:
        return Decision(Action.WAIT_FOR_LEARNER, "implementation gate is blocked", **base)
    if pipeline.phase is PipelinePhase.CYCLE_COMPLETE:
        if learner.state is not LearningState.MASTERED:
            return Decision(
                Action.WAIT_FOR_EVIDENCE,
                "project complete; learner evidence gate remains",
                **base,
            )
        return Decision(Action.CYCLE_COMPLETE, "project and active unit are complete", **base)

    plan = PHASE_PLANS.get(pipeline.phase)
    if plan is None:
        return Decision(Action.INVALID_STATE, "phase has no approved plan", **base)
    if runtime.failed_attempts >= plan.retry_limit:
        return Decision(
            Action.BLOCKED,
            f"retry limit exhausted ({runtime.failed_attempts}/{plan.retry_limit})",
            plan=plan,
            **base,
        )
    return Decision(Action.RUN_PHASE, f"approved {plan.name} phase is ready", plan=plan, **base)
