"""Retention windows per dictionary v1 §retencao (AID-5009).

Only the OS stream can measure retention: `installationId` is the sole
cross-day subject (`pseudonymous-installation`; dictionary §envelopes).
Literacy retention is structurally `not_measured` (G8) — emitted as a reason,
never as zero (NC-8).

Definitions (documented, deterministic):
- `retention_cross_day` — installations with events on >= 2 distinct UTC days
  (the dictionary's own observable).
- `r1` / `r7` / `r21` — installations with at least one event in the window
  (first_day + 1 .. first_day + W] measured in days from the installation's
  FIRST observed day; each window is inclusive of its last day. Windows are
  descriptive labels, not causal claims.

All rates apply k>=5 suppression (NC-5).
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from .funnel import K_THRESHOLD, day_of, rate

WINDOW_DAYS = {"r1": 1, "r7": 7, "r21": 21}

LITERACY_NOT_MEASURED = {
    "value": "not_measured",
    "reason": (
        "G8: sessionId efêmero por page load; sem identificador cross-dia "
        "no literacy standalone (ADR-0009 emenda AID-913)"
    ),
}


def _parse_day(day: str) -> date:
    return date.fromisoformat(day)


def compute_os_retention(events: list[dict]) -> dict:
    """Retention for one deduped OS stream, by installationId."""
    by_install: dict[str, set[str]] = defaultdict(set)
    for ev in events:
        by_install[str(ev["dimensions"]["installationId"])].add(day_of(ev["occurredAt"]))

    cross_day = sum(1 for days in by_install.values() if len(days) >= 2)

    windows = {label: 0 for label in WINDOW_DAYS}
    for days in by_install.values():
        first = min(_parse_day(d) for d in days)
        for label, span in WINDOW_DAYS.items():
            end = first + timedelta(days=span)
            if any(first < _parse_day(d) <= end for d in days):
                windows[label] += 1

    return {
        "subjects": len(by_install),
        "subject_id": "installationId",
        "retention_cross_day": cross_day,
        "retention_cross_day_rate": rate(cross_day, len(by_install)),
        "windows": {
            label: {"installations": count, "rate": rate(count, len(by_install))}
            for label, count in windows.items()
        },
        "window_definition": (
            "retorno em >=1 evento no intervalo (primeiro_dia + 1 .. primeiro_dia + W]; "
            "unidade: instalação pseudônima; experiência, não aprendizagem"
        ),
        "k_threshold": K_THRESHOLD,
    }


def compute_literacy_retention(events: list[dict]) -> dict:
    """Structurally not measurable (G8) — emitted as reason, never zero."""
    return {"subjects": None, "subject_id": None, **LITERACY_NOT_MEASURED}
