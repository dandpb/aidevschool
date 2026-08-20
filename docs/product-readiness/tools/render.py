from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Final

from .evaluate import current_decision
from .models import Assessment, ReadinessDomain


GENERATED_MARKER: Final = "<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->"


def render_matrix(domain: ReadinessDomain, repo_root: Path | None = None, now: datetime | None = None) -> str:
    repository = Path(domain.root).parents[1] if repo_root is None else repo_root
    current_time = datetime.now(timezone.utc) if now is None else now
    lines = [
        GENERATED_MARKER,
        "",
        "# Product Readiness",
        "",
        "Regenerate with `python3 docs/product-readiness/tools/cli.py render`.",
        "Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.",
        "",
        "| Use case | Surface | Intended tier | Current status | Promise |",
        "| --- | --- | --- | --- | --- |",
    ]
    for use_case in sorted(domain.use_cases, key=lambda item: item.id):
        decision = current_decision(domain, use_case, repository, current_time)
        lines.append(
            f"| `{use_case.id}` | {use_case.surface} | `{use_case.intended_tier}` | "
            f"`{decision.outcome}` | {use_case.promise} |"
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
