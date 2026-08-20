from __future__ import annotations

from pathlib import Path
from typing import Final

from .models import DecisionOutcome, ReadinessDomain


GENERATED_MARKER: Final = "<!-- DO NOT EDIT BY HAND: generated from policy.yaml, inventory.yaml, and scenarios/*.yaml -->"


def render_matrix(domain: ReadinessDomain) -> str:
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
        lines.append(
            f"| `{use_case.id}` | {use_case.surface} | `{use_case.intended_tier}` | "
            f"`{DecisionOutcome.UNASSESSED}` | {use_case.promise} |"
        )
    lines.extend(
        [
            "",
            "## Status note",
            "",
            "`unassessed` means the intended promise has canonical scenarios and guides but no promoted independent assessment.",
            "A runnable engine or passing producer test does not grant a readiness tier.",
            "",
            "## Canonical sources",
            "",
            "- `policy.yaml` owns tiers, severity treatment, outcomes, and freshness rules.",
            "- `inventory.yaml` owns intended promises and use-case scope.",
            "- `scenarios/*.yaml` own executable and observed journey contracts.",
            "- `student-guide.md` and `facilitator-guide.md` own audience guidance.",
            "",
        ]
    )
    return "\n".join(lines)


def expected_views(domain: ReadinessDomain) -> tuple[tuple[Path, str], ...]:
    return ((Path(domain.root) / "README.md", render_matrix(domain)),)


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
