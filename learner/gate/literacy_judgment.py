"""Judgment verification for prompt_builder free-text answers.

One Noul per field against the canonical rubric's intent (``learner/gate/
literacy_evaluator`` used to raise here — the RFC-accepted exception to the
deterministic-verifier rule). Thresholds are code-owned named constants;
the 0.4–0.75 band escalates to the owner via the verifier's queue. Every
sweep is a committed digest-named receipt via ``judgments.ask_and_record``,
so re-verification replays it — same evidence, same verdict.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

from learner.substrate import judgments

#: Mean field-probability at/above which the activity passes (mirrors the
#: evaluator's ACTIVITY_PASS_THRESHOLD — the RFC's 0.75 converges with it).
PASS_THRESHOLD = 0.75

#: Below PASS_THRESHOLD and at/above this, the verdict escalates to the owner.
ESCALATE_THRESHOLD = 0.4

Client = Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]


class LiteracyJudgmentError(RuntimeError):
    """Judgment verification could not run (no key / API failure). Fail closed."""


def _field_questions(
    activity: dict[str, Any], values: dict[str, str]
) -> tuple[dict[str, Any], dict[str, Any]]:
    """One Noul per answered field; state carries the rubric's full intent."""
    data = activity.get("data") or {}
    evaluation = activity.get("evaluation") or {}
    rubric_fields = evaluation.get("fields") or {}
    declared = {field.get("id"): field for field in data.get("fields") or []}
    entries: dict[str, Any] = {}
    questions: dict[str, Any] = {}
    unknown = set(values) - set(declared)
    if unknown:
        raise LiteracyJudgmentError(
            f"answer values carry undeclared field ids: {sorted(unknown)}"
        )
    for field_id, text in values.items():
        field = declared[field_id]
        qid = f"{activity.get('id', 'activity')}::{field_id}"
        entries[qid] = {
            "scenario": data.get("scenario", ""),
            "generic_prompt": data.get("genericPrompt", ""),
            "field_label": field.get("label", field_id),
            "field_hint": field.get("hint", ""),
            "rubric": rubric_fields.get(field_id, {}),
            "answer_text": text,
        }
        questions[qid] = {
            "type": "noul",
            "instructions": (
                f"Judging `entries.{qid}`: does `answer_text` satisfy the "
                "field's rubric intent — a `{field_label}` for the scenario "
                "the `field_hint` describes — at the quality a reusable "
                "model requires? Paraphrase satisfies; generic, keyword-"
                "stuffed, or off-intent text does not. The `rubric` lists "
                "the canonical intent (its literal keywords are examples of "
                "meaning, not requirements to copy)."
            ),
            "criteria": {
                "true": "The field text substantively satisfies the rubric's intent for this scenario",
                "false": "The field text is missing, generic, off-intent, or vacuously keyword-stuffed",
            },
        }
    return {"entries": entries}, questions


def verify_prompt_builder(
    activity: dict[str, Any],
    values: dict[str, str],
    client: Client,
    receipts_root: Path | None = None,
) -> dict[str, Any]:
    """Judge every field; return the recomputation block.

    Returns ``{"deterministicChecks": {...}, "score": mean, "pass": bool,
    "escalate": bool, "judgment": {...}}``. Raises
    :class:`LiteracyJudgmentError` when the judgment cannot run — the caller
    fails closed exactly like the old raise did.
    """
    state, questions = _field_questions(activity, values)
    if not questions:
        raise LiteracyJudgmentError(
            "prompt_builder answer has no fields bound to the activity"
        )
    result = judgments.ask_and_record(
        "literacy", "noul", state, questions, client, receipts_root
    )
    if result is None:
        raise LiteracyJudgmentError(
            "prompt_builder verification requires a reachable judgment API "
            "(set TYPESAFE_API_KEY); see the fallback receipt for the failure"
        )
    answers, digest = result
    field_scores = {
        qid.split("::", 1)[1]: judgments.noul_value(answers.get(qid))
        for qid in questions
    }
    score = sum(field_scores.values()) / len(field_scores)
    return {
        "deterministicChecks": {k: round(v, 2) for k, v in field_scores.items()},
        "score": round(score, 2),
        "pass": score >= PASS_THRESHOLD,
        "escalate": ESCALATE_THRESHOLD <= score < PASS_THRESHOLD,
        "judgment": {"receipt_digest": digest, "field_scores": field_scores},
    }
