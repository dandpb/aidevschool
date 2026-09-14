from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Final

from .evaluate import current_decision, latest_assessment
from .models import Assessment, DecisionOutcome, ReadinessDomain, ReadinessDecision, UseCase


GENERATED_MARKER: Final = "<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->"


def recorded_decision(domain: ReadinessDomain, use_case: UseCase) -> ReadinessDecision:
    """Return the decision exactly as promoted by the latest assessment.

    Pure function of the tracked readiness sources: no wall clock and no
    working-tree fingerprints participate, so generated views derived from it
    are deterministic on any checkout (AID-1890).
    """
    assessment = latest_assessment(domain, use_case)
    if assessment is None:
        return ReadinessDecision(
            use_case.id, DecisionOutcome.UNASSESSED, None, ("no promoted assessment",), ()
        )
    return next(
        decision for decision in assessment.decisions if decision.use_case_id == use_case.id
    )


def live_deviations(
    domain: ReadinessDomain,
    repo_root: Path,
    now: datetime | None = None,
) -> tuple[tuple[UseCase, ReadinessDecision, ReadinessDecision], ...]:
    """Compare promoted decisions against a live re-evaluation.

    A deviation means the claims are in a stale window for this tree/clock:
    sources under a use case's fingerprints drifted from the promoted state,
    or an assessment crossed its revalidateBy date. This is the re-grant
    factory's signal; it is deliberately NOT part of view drift (AID-1890).
    """
    current_time = datetime.now(timezone.utc) if now is None else now
    deviations = []
    for use_case in sorted(domain.use_cases, key=lambda item: item.id):
        recorded = recorded_decision(domain, use_case)
        current = current_decision(domain, use_case, repo_root, current_time)
        if (recorded.outcome, recorded.granted_tier) != (current.outcome, current.granted_tier):
            deviations.append((use_case, recorded, current))
    return tuple(deviations)


def render_matrix(domain: ReadinessDomain) -> str:
    lines = [
        GENERATED_MARKER,
        "",
        "# Product Readiness",
        "",
        "Regenerate with `python3 docs/product-readiness/tools/cli.py render`.",
        "Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.",
        "",
        "| Use case | Surface | Intended tier | Current outcome | Granted tier | Verified at | Revalidate by | Evidence scope | Reasons/gaps | Promise |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for use_case in sorted(domain.use_cases, key=lambda item: item.id):
        decision = recorded_decision(domain, use_case)
        assessments = tuple(
            assessment
            for assessment in domain.assessments
            if any(item.use_case_id == use_case.id for item in assessment.decisions)
        )
        latest = max(assessments, key=lambda item: item.verified_at, default=None)
        verified_at = "-" if latest is None else latest.verified_at.isoformat()
        revalidate_by = "-" if latest is None else latest.revalidate_by.isoformat()
        evidence_scope = ", ".join(f"`{run_id}`" for run_id in decision.result_run_ids) or "-"
        reasons = "; ".join(decision.reasons) or "-"
        granted_tier = decision.granted_tier or "-"
        lines.append(
            f"| `{use_case.id}` | {use_case.surface} | `{use_case.intended_tier}` | `"
            f"{decision.outcome}` | `{granted_tier}` | `{verified_at}` | `{revalidate_by}` | "
            f"{evidence_scope} | {reasons} | {use_case.promise} |"
        )
    lines.extend(
        [
            "",
            "## Status note",
            "",
            "`unassessed` means the intended promise has canonical scenarios and guides but no promoted independent assessment.",
            "Published decisions can also be `pass`, `conditional-follow-up`, `downgraded`, `blocked`, or `stale`.",
            "A runnable engine or passing producer test does not grant a readiness tier.",
            "",
            "## Canonical sources",
            "",
            "- `policy.yaml` owns tiers, severity treatment, outcomes, and freshness rules.",
            "- `inventory.yaml` owns intended promises and use-case scope.",
            "- `scenarios/*.yaml` own executable and observed journey contracts.",
            "- `evidence/results.ndjson` owns append-only promoted scenario facts.",
            "- `assessments/*.yaml` own immutable independent decisions.",
            "- `student-guide.md` and `facilitator-guide.md` own audience guidance.",
            "",
            "## Tier elevation and supersession",
            "",
            "The current-tier gate in `tools/validate.py` binds only the latest decision per use case (newest `verifiedAt`).",
            "After an intended-tier elevation, strictly older decisions are superseded history: they still obey every",
            "integrity rule (outcome/tier coherence, known runs, duplicate protection) and are exempt only from equality",
            "with the current `intendedTier`, so the gate closes with the new assessment alone — no manual rewrite of past",
            "assessments. Decisions sharing the newest `verifiedAt` all face the gate (fail-closed). A bump without a newer",
            "re-grant stays red with exactly one wrong-tier error on the latest decision, and the claim stales until",
            "re-granted via `enforce`.",
            "",
        ]
    )
    return "\n".join(lines)


def render_assessment(assessment: Assessment) -> str:
    lines = [
        GENERATED_MARKER,
        "",
        f"# Readiness Assessment `{assessment.assessment_id}`",
        "",
        f"- Verified at: `{assessment.verified_at.isoformat()}`",
        f"- Revalidate by: `{assessment.revalidate_by.isoformat()}`",
        f"- Git SHA: `{assessment.git_sha}`",
        f"- Assessor context: `{assessment.assessor_context}`",
        "",
        "| Use case | Outcome | Granted tier | Result runs | Reasons |",
        "| --- | --- | --- | --- | --- |",
    ]
    for decision in sorted(assessment.decisions, key=lambda item: item.use_case_id):
        tier = decision.granted_tier or "-"
        runs = ", ".join(f"`{run_id}`" for run_id in decision.result_run_ids) or "-"
        reasons = "; ".join(decision.reasons) or "-"
        lines.append(f"| `{decision.use_case_id}` | `{decision.outcome}` | `{tier}` | {runs} | {reasons} |")
    lines.append("")
    return "\n".join(lines)


def expected_views(domain: ReadinessDomain) -> tuple[tuple[Path, str], ...]:
    root = Path(domain.root)
    assessment_views = tuple(
        (root / "assessments" / f"{assessment.assessment_id}.md", render_assessment(assessment))
        for assessment in sorted(domain.assessments, key=lambda item: item.assessment_id)
    )
    return ((root / "README.md", render_matrix(domain)), *assessment_views)


def drift(domain: ReadinessDomain) -> tuple[Path, ...]:
    changed: list[Path] = []
    for path, expected in expected_views(domain):
        try:
            actual = path.read_text(encoding="utf-8")
        except FileNotFoundError:
            changed.append(path)
            continue
        if actual != expected:
            changed.append(path)
    return tuple(changed)


def write_views(domain: ReadinessDomain) -> tuple[Path, ...]:
    changed: list[Path] = []
    for path, expected in expected_views(domain):
        try:
            actual = path.read_text(encoding="utf-8")
        except FileNotFoundError:
            actual = ""
        if actual != expected:
            path.write_text(expected, encoding="utf-8")
            changed.append(path)
    return tuple(changed)
