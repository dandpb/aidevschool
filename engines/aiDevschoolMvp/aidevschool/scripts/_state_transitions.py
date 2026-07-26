from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path
from typing import Any

import importlib as _importlib

_core = _importlib.import_module("_core")
gap_days, parse_iso = _core.gap_days, _core.parse_iso

LOCKED, AVAILABLE, IN_PROGRESS, ATTEMPTED, MASTERED, REVIEW_DUE = (
    "LOCKED",
    "AVAILABLE",
    "IN_PROGRESS",
    "ATTEMPTED",
    "MASTERED",
    "REVIEW_DUE",
)


def expected_attempt_id(cid: str, attempt_no: int) -> str:
    return f"att_{cid.lower()}_{attempt_no:04d}"


def _prereqs_mastered(
    state: dict[str, Any],
    curriculum: dict[str, dict[str, Any]],
    cid: str,
) -> bool:
    return all(
        state["concepts"][prerequisite]["status"] == MASTERED
        for prerequisite in curriculum[cid]["prerequisites"]
    )


def t_unlock(state, curriculum_list, cid):
    by_id = {record["id"]: record for record in curriculum_list}
    concept = state["concepts"][cid]
    if concept["status"] != LOCKED:
        return ("noop", "not locked")
    if not _prereqs_mastered(state, by_id, cid):
        return ("reject", f"prerequisites not mastered for {cid}")
    concept["status"] = AVAILABLE
    return ("moved", (LOCKED, AVAILABLE))


def t_lesson_start(state, cid, scaffold_level):
    concept = state["concepts"][cid]
    if concept["status"] != AVAILABLE:
        return ("reject", f"lesson_start on {cid} in state {concept['status']}")
    if concept["deferred"]:
        return ("reject", f"{cid} is deferred until a new session")
    if state["session"]["phase"] != "idle":
        return (
            "reject",
            f"lesson_start requires idle phase, got {state['session']['phase']}",
        )
    concept["status"] = IN_PROGRESS
    concept["scaffold_level"] = scaffold_level
    state["session"]["phase"] = "awaiting_attempt"
    state["session"]["current_concept"] = cid
    return ("moved", (AVAILABLE, IN_PROGRESS))


def t_attempt(state, cid, attempt_id, ledger_keys, *, review=False):
    concept = state["concepts"][cid]
    if review:
        if concept["status"] != REVIEW_DUE:
            return (
                "reject",
                f"attempt on {cid} in state {concept['status']}, expected REVIEW_DUE",
            )
    elif concept["status"] not in (IN_PROGRESS, ATTEMPTED):
        return (
            "reject",
            f"attempt on {cid} in state {concept['status']}, "
            "expected IN_PROGRESS or ATTEMPTED",
        )
    if state["session"]["phase"] != "awaiting_attempt":
        return (
            "reject",
            f"attempt requires awaiting_attempt phase, got {state['session']['phase']}",
        )
    if f"attempt_id|{attempt_id}" in ledger_keys:
        return ("noop", "duplicate attempt_id")

    transitioned = not review and concept["status"] == IN_PROGRESS
    if transitioned:
        concept["status"] = ATTEMPTED
    concept["attempts"] += 1
    state["session"]["phase"] = "feedback"
    state["session"]["attempts_this_session"] += 1
    if review:
        return ("noop", "review attempt recorded (no status transition)")
    if transitioned:
        return ("moved", (IN_PROGRESS, ATTEMPTED))
    return ("noop", "continued attempt on ATTEMPTED (no status transition)")


def t_verdict_pass(state, cid, *, gate_contract_complete: bool, review: bool):
    concept = state["concepts"][cid]
    if review:
        if concept["status"] != REVIEW_DUE:
            return ("reject", f"review_pass on {cid} in state {concept['status']}")
        concept["status"] = MASTERED
        concept["scaffold_level"] = None
        concept["target_days_effective"] = min(
            2 * (concept["target_days_effective"] or 1),
            365,
        )
        return ("moved", (REVIEW_DUE, MASTERED))
    if concept["status"] != ATTEMPTED:
        return ("reject", f"verdict_pass on {cid} in state {concept['status']}")
    if not gate_contract_complete:
        return ("noop", "gate contract incomplete (first G3 pass; no row)")
    concept["status"] = MASTERED
    concept["scaffold_level"] = None
    return ("moved", (ATTEMPTED, MASTERED))


def t_verdict_fail(state, cid, *, review: bool, curriculum_target: int):
    concept = state["concepts"][cid]
    expected = REVIEW_DUE if review else ATTEMPTED
    if concept["status"] != expected:
        return (
            "reject",
            f"verdict_fail on {cid} in state {concept['status']}, expected {expected}",
        )

    concept["scaffold_level"] = max(1, (concept["scaffold_level"] or 1) - 1)
    concept["failures_this_session"] += 1
    if concept["failures_this_session"] >= 2:
        concept["deferred"] = True
    concept["status"] = IN_PROGRESS
    if review:
        concept["target_days_effective"] = curriculum_target
        return ("moved", (REVIEW_DUE, IN_PROGRESS))
    return ("moved", (ATTEMPTED, IN_PROGRESS))


def t_review_due(state, cid):
    concept = state["concepts"][cid]
    if concept["status"] != MASTERED:
        return ("reject", f"review_due on {cid} in state {concept['status']}")
    concept["status"] = REVIEW_DUE
    return ("moved", (MASTERED, REVIEW_DUE))


def schedule_next_review(concept: dict[str, Any], last_pass_ts: str) -> str:
    gap = gap_days(concept["target_days_effective"])
    return (
        (parse_iso(last_pass_ts) + timedelta(days=gap))
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def primary_pass_count(
    state,
    ledger,
    registry,
    skill_dir: Path,
    cid,
    llm_enabled,
) -> int:
    binding = registry["concept_bindings"][cid]
    primary = binding["primary"]
    served = (
        "G3"
        if primary["gate_id"] == "G4" and not llm_enabled
        else primary["gate_id"]
    )
    if served == "G3":
        return state["concepts"][cid]["gate_progress"]["consecutive_passes"]
    primary_rubric = None
    if primary["gate_id"] == "G4":
        primary_rubric = json.loads(
            (skill_dir / primary["definition"]).read_text(encoding="utf-8")
        ).get("rubric_id")
    for event in ledger:
        if event["type"] != "verdict_issued":
            continue
        payload = event["payload"]
        if (
            payload.get("concept_id") != cid
            or payload.get("gate_id") != primary["gate_id"]
            or payload.get("verdict") != "pass"
        ):
            continue
        if primary["gate_id"] == "G4":
            if (
                payload["evidence"]["verifier"].get("rubric_id")
                == primary_rubric
            ):
                return 1
        else:
            return 1
    return 0


def assessment_role(
    state,
    ledger,
    registry,
    skill_dir: Path,
    cid,
    record,
    llm_enabled,
) -> str:
    if not record["teach_back"]:
        return "primary"
    if state["concepts"][cid]["gate_progress"].get("teach_back_passed"):
        return "primary"
    if (
        primary_pass_count(
            state,
            ledger,
            registry,
            skill_dir,
            cid,
            llm_enabled,
        )
        >= 1
    ):
        return "teach_back"
    return "primary"
