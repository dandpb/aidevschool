from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
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


def _current_branch(repo_root: Path) -> str:
    completed = subprocess.run(
        ["git", "branch", "--show-current"],
        cwd=repo_root,
        check=False,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


def write_proposal_state(
    outcome: Written | PendingObservation,
    proposal: AssessmentProposal,
    path: Path,
    repo_root: Path | None = None,
) -> Path:
    """Serialize the proposal state machine for the observation gate (AID-2203 R1).

    Emits a stable JSON manifest next to the proposal: `pending-observation`
    carries the per-use-case checklist the independent observer must clear;
    `written` documents why there is no observation phase (empty checklist —
    an independent report was already in the tree). Called on the exit-3 path
    before the checklist is printed and on the exit-0 path before any
    assessment/view writes; the defect (1) and guard/usage (2) paths never
    reach this function, so no manifest exists for them.
    """
    root = repo_root if repo_root is not None else Path(__file__).resolve().parents[3]
    if isinstance(outcome, PendingObservation):
        status = "pending-observation"
        use_cases = [
            {"id": use_case_id, "pending": list(pending)}
            for use_case_id, pending in outcome.checklist
        ]
    else:
        status = "written"
        use_cases = []
    payload = {
        "schemaVersion": 1,
        "status": status,
        "assessmentId": str(proposal.request.assessment_id),
        "gitSha": str(proposal.request.git_sha),
        "branch": _current_branch(root),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "useCases": use_cases,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return path
