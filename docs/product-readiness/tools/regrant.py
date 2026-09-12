from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path

from .enforcement import unsupported_candidate_reasons
from .evidence import AssessmentProposal
from .models import DecisionOutcome, ReadinessDomain, UseCaseId


GUARD_MESSAGE = "INVALID: regrant writes must land on a re-grant branch, not main"


class RegrantBranchError(Exception):
    """The current checkout is not a safe target for regrant writes."""

    def __init__(self, message: str = GUARD_MESSAGE) -> None:
        super().__init__(message)
        self.message = message


def require_regrant_branch(repo_root: Path) -> str:
    """Refuse regrant writes on `main` and on detached checkouts (AID-1357 R2).

    Returns the current branch name when the guard passes. A detached HEAD
    makes `git branch --show-current` print nothing, so an empty branch name is
    treated the same as `main`: wrong write target, exit 2, nothing written.
    """
    completed = subprocess.run(
        ["git", "branch", "--show-current"],
        cwd=repo_root,
        check=False,
        capture_output=True,
        text=True,
    )
    branch = completed.stdout.strip()
    if completed.returncode != 0 or not branch or branch == "main":
        raise RegrantBranchError()
    return branch


@dataclass(frozen=True, slots=True)
class Written:
    """Every decision is grantable: perform the assess+render write pair."""


@dataclass(frozen=True, slots=True)
class PendingObservation:
    """Every BLOCKED decision is producer-only: no writes, print the checklist."""

    checklist: tuple[tuple[UseCaseId, tuple[str, ...]], ...]


@dataclass(frozen=True, slots=True)
class Defect:
    """At least one BLOCKED decision cites reasons beyond the producer/assessor
    boundary (stale fingerprint, failed scenario, digest divergence, severe
    gap): refuse without a PR."""

    reasons: tuple[str, ...]


def classify_proposal(
    domain: ReadinessDomain, proposal: AssessmentProposal
) -> Written | PendingObservation | Defect:
    """Split proposal decisions along the producer/assessor boundary.

    The producer-only reason set is exactly the one
    `enforcement.unsupported_candidate_reasons` filters out, so the classifier
    and enforcement can never disagree about which defects a producer is
    allowed to cause (AID-1357 R1).
    """
    scenarios_by_use_case = {use_case.id: use_case.scenario_ids for use_case in domain.use_cases}
    defect_reasons: list[str] = []
    checklist: list[tuple[UseCaseId, tuple[str, ...]]] = []
    for decision in proposal.assessment.decisions:
        if decision.outcome is not DecisionOutcome.BLOCKED:
            continue
        scenario_ids = scenarios_by_use_case[decision.use_case_id]
        defects = unsupported_candidate_reasons(decision, scenario_ids)
        if defects:
            defect_reasons.extend(defects)
            continue
        producer_only = tuple(
            reason for reason in decision.reasons if reason not in defects
        )
        checklist.append((decision.use_case_id, producer_only))
    if defect_reasons:
        return Defect(tuple(defect_reasons))
    if checklist:
        return PendingObservation(tuple(checklist))
    return Written()
