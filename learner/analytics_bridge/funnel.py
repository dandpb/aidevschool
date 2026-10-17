"""Deterministic funnel derivations per dictionary v1 (AID-3515).

Implements the dictionary's observable rules over VALIDATED events
(`contracts.validate_event` first — this module never trusts raw input):

- dedup by `eventId` (NC-1: beacon+fetch double delivery counts once);
- literacy funnel by ephemeral session (visita ≠ pessoa, NC-2), retry as
  >=2 attempts on the same (sessionId, lessonId) (NC-3), deterministic error
  from `passed=false` (NC-4), resumption only from `entry=lesson-resume`
  envelopes that carry the prop (pre-v4 envelopes stay out of denominators);
- OS funnel by installation: onboarding activation, attempt submitted,
  error as PROXY (submitted whose (installation, session, mission) has no
  `structured_attempt.passed` — never ordered by `sequence`), feedback =
  passed observable, retry from `retry.requested`, resumption from
  `journey.returned`;
- retention windows in `retention.py`; rates suppressed below k=5 (NC-5);
  sources without data are `not_measured` with a reason (NC-8).
"""
from __future__ import annotations

from collections import defaultdict

from .contracts import validate_event

K_THRESHOLD = 5  # AID-463 §3.0 — immutable (ADR-0010)

LITERACY_FUNNEL_STAGES: tuple[tuple[str, str], ...] = (
    ("entrada", "entry_viewed"),
    ("brief", "lesson_brief_viewed"),
    ("licao_iniciada", "lesson_started"),
    ("primeira_atividade_exposta", "activity_presented"),
    ("tentativa", "activity_attempted"),
    ("licao_concluida", "lesson_completed"),
)


def dedup(events: list[dict], stream: str) -> tuple[list[dict], int]:
    """NC-1: same eventId twice (beacon+fetch) counts once, per stream."""
    seen: set[str] = set()
    kept: list[dict] = []
    duplicates = 0
    for ev in events:
        event_id = ev.get("eventId")
        if not isinstance(event_id, str) or not event_id:
            raise ValueError(f"{stream}: event without eventId")
        if event_id in seen:
            duplicates += 1
            continue
        seen.add(event_id)
        kept.append(ev)
    return kept, duplicates


def validate_stream(events: list[dict], stream: str) -> list[str]:
    """Envelope-validate every event; returns one error string per violation."""
    errors: list[str] = []
    for index, ev in enumerate(events):
        for violation in validate_event(ev):
            errors.append(f"{stream}[{index}]: {violation}")
    return errors


def day_of(iso: str) -> str:
    return str(iso)[:10]


def rate(numerator: int, denominator: int) -> dict:
    """Rate exists only with denominator >= k; never 0, never a bare ratio."""
    if denominator < K_THRESHOLD:
        return {"value": "suppressed", "n": denominator, "k": K_THRESHOLD}
    return {"value": round(numerator / denominator, 4), "n": numerator, "den": denominator}


def _attempt_rows(events: list[dict]) -> list[dict]:
    return [e for e in events if e.get("event") == "activity_attempted"]


def _retry_pairs(attempts: list[dict]) -> set[tuple[str, str]]:
    lesson_attempts: dict[tuple[str, str], int] = defaultdict(int)
    for attempt in attempts:
        lesson_id = attempt.get("props", {}).get("lessonId")
        lesson_attempts[(attempt["sessionId"], str(lesson_id))] += 1
    return {key for key, count in lesson_attempts.items() if count >= 2}


def _entry_stats(events: list[dict]) -> tuple[list[dict], dict[str, int], int]:
    with_prop = [
        e for e in events
        if e.get("event") == "entry_viewed" and "entry" in e.get("props", {})
    ]
    split: dict[str, int] = defaultdict(int)
    for e in with_prop:
        split[str(e["props"]["entry"])] += 1
    pre_v4 = sum(
        1 for e in events
        if e.get("event") == "entry_viewed" and "entry" not in e.get("props", {})
    )
    return with_prop, split, pre_v4


def _session_stage_counts(by_session: dict[str, list[dict]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for stage, event in LITERACY_FUNNEL_STAGES:
        counts[stage] = sum(
            1 for session_events in by_session.values()
            if any(e.get("event") == event for e in session_events)
        )
    return counts


def compute_literacy(events: list[dict]) -> dict:
    """Dictionary observables for literacy v2 over one deduped stream."""
    by_session: dict[str, list[dict]] = defaultdict(list)
    for ev in events:
        by_session[ev["sessionId"]].append(ev)

    attempts = _attempt_rows(events)
    failed = [a for a in attempts if a.get("props", {}).get("passed") is False]
    with_prop, entry_split, pre_v4 = _entry_stats(events)

    return {
        "sessions_total": len(by_session),
        "funnel_counts": _session_stage_counts(by_session),
        "attempts_total": len(attempts),
        "attempts_failed_deterministic": len(failed),
        "attempt_error_rate": rate(len(failed), len(attempts)),
        "retry_session_lesson_pairs": len(_retry_pairs(attempts)),
        "entry_split": dict(entry_split),
        "entry_pre_v4_without_prop": pre_v4,
        "resume_rate": rate(
            entry_split.get("lesson-resume", 0), len(with_prop),
        ),
        "retention": "not_measured",  # NC-8 — never 0
        "retention_reason": (
            "G8: sessionId efêmero por page load; retenção cross-dia "
            "inobservável no literacy standalone (ADR-0009 emenda AID-913)"
        ),
    }


def _os_attempt_key(ev: dict) -> tuple[str, str, str | None]:
    dims = ev.get("dimensions", {})
    return (str(dims.get("installationId")), str(dims.get("sessionId")),
            dims.get("missionId") if dims.get("missionId") is not None else None)


def _error_proxy_rows(submitted: list[dict], passed_keys: set) -> list[dict]:
    return [e for e in submitted if _os_attempt_key(e) not in passed_keys]


def _installations_with(by_install: dict[str, list[dict]], event_name: str) -> int:
    return sum(
        1 for evs in by_install.values()
        if any(e.get("name") == event_name for e in evs)
    )


def compute_os(events: list[dict]) -> dict:
    """Dictionary observables for OS v1 over one deduped stream."""
    by_install: dict[str, list[dict]] = defaultdict(list)
    for ev in events:
        by_install[ev["dimensions"]["installationId"]].append(ev)

    def named(event: str) -> list[dict]:
        return [e for e in events if e.get("name") == event]

    submitted = named("structured_attempt.submitted")
    passed = named("structured_attempt.passed")
    passed_keys = {_os_attempt_key(e) for e in passed}
    error_proxy = _error_proxy_rows(submitted, passed_keys)
    onboarding_started = _installations_with(by_install, "onboarding.started")
    onboarding_completed = _installations_with(by_install, "onboarding.completed")
    mission_completed = len(named("mission.completed"))

    return {
        "installations": len(by_install),
        "onboarding_started": onboarding_started,
        "onboarding_completed": onboarding_completed,
        "onboarding_completion_rate": rate(onboarding_completed, onboarding_started),
        "attempts_submitted": len(submitted),
        "feedback_observable_passed": len(passed),
        "attempts_error_proxy": len(error_proxy),
        "attempts_error_proxy_note": (
            "proxy: submitted cuja chave (instalação, sessão, missão) não tem "
            "nenhum passed — sem pareamento por tentativa nem uso de sequence "
            "(dicionário §erro)"
        ),
        "feedback_negative_not_observable": "not_measured",
        "feedback_negative_reason": (
            "TF-1: veredito negativo exibido não emite evento no vocabulário OS v1"
        ),
        "retry_requested": len(named("retry.requested")),
        "missions_completed": mission_completed,
    }


def compute_funnel(literacy_events: list[dict], os_events: list[dict]) -> dict:
    """Full funnel section: dedup + per-stream dictionary derivations."""
    lit, lit_dup = dedup(literacy_events, "literacy")
    os_, os_dup = dedup(os_events, "os")
    return {
        "pipeline": {
            "rows_read": len(literacy_events) + len(os_events),
            "events_accepted": len(lit) + len(os_),
            "duplicates_removed": lit_dup + os_dup,
        },
        "literacy": compute_literacy(lit),
        "os": compute_os(os_),
    }
