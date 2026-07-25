#!/usr/bin/env python3
"""gate_check.py — §4.2 entry point and the only scoring/mutation path for
attempts. Parses first (§6.3.2), fires attempt_submitted only for a valid
artifact, scores G1–G4, emits the ch.6 VerdictRecord, appends the ledger lines,
updates state.json. The persona never grades; this script disposes (laws L1–L2).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

import learner.gate.core as _core
import learner.gate.engine as _engine
import learner.gate.state as _state


def _emit(obj: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _resolve_gate(binding, pending_gate_id, llm_enabled):
    tb = binding.get("teach_back")
    if pending_gate_id == "G4" and tb is not None:
        if llm_enabled:
            return "G4", tb["definition"], True
        return "G3", tb["fallback"], True
    prim = binding["primary"]
    if prim["gate_id"] == "G4":
        if llm_enabled:
            return "G4", prim["definition"], False
        return "G3", prim["fallback"], False
    return prim["gate_id"], prim["definition"], False


def _verifier_descriptor(gate_id, definition, config, recorded_model):
    if gate_id == "G4":
        return {
            "kind": "rubric_llm",
            "model": recorded_model or config.get("verifier_model", "inherit"),
            "temperature": 0,
            "rubric_id": definition["rubric_id"],
            "rubric_version": definition["rubric_version"],
        }
    return {"kind": "deterministic"}


def _details(gate_id, definition, scores, attempt_id, drawn_ids, hours_since_prev):
    if gate_id == "G1":
        return {"key_id": definition["key_id"], "key_version": definition["key_version"],
                "claims_total": definition["items"]["claims_total"], "normalized_flags": scores["flagged"]}
    if gate_id == "G2":
        base = {"key_id": definition["key_id"], "key_version": definition["key_version"]}
        if definition["kind"] == "pii_list":
            base["seeded_items_remaining"] = []
            base["unseeded_redactions"] = []
        return base
    if gate_id == "G3":
        d = {"key_id": definition["key_id"], "key_version": definition["key_version"],
             "bank_size": len(definition["items"]["bank"]), "draw_seed": attempt_id}
        if hours_since_prev is not None:
            d["hours_since_first_pass"] = round(hours_since_prev, 2)
        d["mastery_rule_met"] = scores.get("consecutive_passes", 0) >= 2
        return d
    return {"misconception_screen": scores.get("misconception_screen"), "items_evaluated": len(scores["items"])}


def _feedback(gate_id, scores, verdict):
    if gate_id == "G4":
        return {"items_fail": [it["feedback"] for it in scores["items"] if not it["pass"] and "feedback" in it]}
    return {}


def _primary_mastered(binding, gp, ledger, concept_id, llm_enabled):
    """Whether the concept's PRIMARY gate contract is met (independent of teach-back)."""
    primary_gate = binding["primary"]["gate_id"]
    served = "G3" if (primary_gate == "G4" and not llm_enabled) else primary_gate
    if served == "G3":
        return gp["consecutive_passes"] >= 2  # 24 h enforced when the 2nd pass fired
    # single-pass primary (G1/G2/G4): a passing primary verdict in the ledger
    for ev in ledger:
        p = ev.get("payload", {})
        if ev["type"] == "verdict_issued" and p.get("concept_id") == concept_id and p.get("gate_id") == served and p.get("verdict") == "pass":
            return True
    return False


def _load_g4_recording(
    skill_dir: Path,
    rubric: dict[str, Any],
    artifact_sha: str,
) -> tuple[dict[str, bool], str | None]:
    p = skill_dir / "keys" / "g4_recordings" / f"{rubric['rubric_id']}.json"
    if not p.is_file():
        _core.die(f"no recorded G4 judgments for rubric {rubric['rubric_id']}", 1)
    data = _load_json(p)
    for entry in data.get("recordings", []):
        if entry["artifact_sha256"] == artifact_sha:
            return entry["judgments"], entry.get("model")
    _core.die(f"no recorded G4 judgment for artifact {artifact_sha[:12]}", 1)
    raise AssertionError


def main() -> None:
    args = _core.read_args()
    state_dir = Path(_core.require(args, "state_dir"))
    skill_dir = Path(_core.require(args, "skill_dir"))
    concept_id = _core.require(args, "concept_id")
    attempt_id = _core.require(args, "attempt_id")
    reply_text = _core.require(args, "reply_text")

    curriculum = _load_json(skill_dir / "curriculum.json")
    by_id = {r["id"]: r for r in curriculum}
    registry = _load_json(skill_dir / "gate_registry.json")
    config = _load_json(state_dir / "config.json")
    llm_enabled = config["feature_flags"]["llm_gates_enabled"]
    binding = registry["concept_bindings"][concept_id]
    rec = by_id[concept_id]

    with _core.state_lock(state_dir):
        state = _core.read_json(state_dir / "state.json")
        ledger = _core.read_ledger(state_dir)
        keys = _core.idempotency_keys(state_dir)
        concept = state["concepts"][concept_id]
        gp = concept["gate_progress"]

        # idempotent double-delivery: replay the recorded verdict, no mutation
        for ev in ledger:
            if ev["type"] == "verdict_issued" and ev["payload"].get("attempt_id") == attempt_id:
                _emit({"ok": True, "idempotent": True, "verdict": ev["payload"]["verdict"],
                       "scores": ev["payload"]["scores"], "feedback": {}, "ledger_event_id": ev["event_id"]})
                return

        pending = state["session"].get("pending_gate_id")
        gate_id, def_path, is_teach_back = _resolve_gate(binding, pending, llm_enabled)
        definition = _load_json(skill_dir / def_path)
        review = concept["status"] == _state.REVIEW_DUE

        # --- PARSE + SCORE first (pure); only a valid artifact fires attempt_submitted ---
        artifact_sha = _core.sha256_hex(reply_text)
        drawn_ids: list[str] = []
        scored: dict[str, Any]
        recorded_model = None
        if gate_id == "G1":
            scored = _engine.score_g1(reply_text, definition)
        elif gate_id == "G2":
            scored = (_engine.score_g2_redaction(reply_text, definition)
                      if definition["kind"] == "pii_list" else _engine.score_g2_scenario(reply_text, definition))
        elif gate_id == "G3":
            # draw is deterministic from attempt_id + asked_item_ids (no mutation)
            bank_ids = [it["item_id"] for it in definition["items"]["bank"]]
            drawn_ids = _engine.draw_g3(attempt_id, bank_ids, gp["asked_item_ids"])
            scored = _engine.score_g3(reply_text, definition, drawn_ids, gp)
        elif gate_id == "G4":
            judgments, recorded_model = _load_g4_recording(
                skill_dir, definition, artifact_sha
            )
            scored = _engine.score_g4(reply_text, definition, judgments)
        else:
            _core.die(f"unknown gate {gate_id}", 2)
            return
        session = state["session"]

        # §6.3.2: a reply the parser cannot normalize is NEVER scored as a wrong
        # answer — no verdict record, no gate_progress mutation, no ledger line,
        # no state change. The "second unparseable reply records attempt_recorded"
        # refinement requires a clarification-tracking field that the closed §8.2
        # session schema (additionalProperties:false) does not provide; it is a
        # documented spec gap, deferred until a versioned schema amendment adds
        # that field. Until then every parse_error returns a clarification with
        # zero mutation, preserving the never-scored-as-wrong invariant.
        if scored["verdict"] == "parse_error":
            _emit({"ok": True, "verdict": "parse_error", "scores": {},
                   "feedback": {"clarify": True}, "ledger_event_id": None})
            return

        # --- valid artifact: fire attempt_submitted (guards first) ---
        outcome = _state.t_attempt(state, concept_id, attempt_id, keys, review=review)
        if outcome[0] == "reject":
            _core.die(outcome[1], 1)

        verdict = scored["verdict"]
        scores = scored["scores"]
        # The pass timestamp is the VERDICT event's ts (§7.1 schedules reviews from
        # it), not the attempt's. attempt_recorded lands at index base_idx, the
        # verdict at base_idx+1, so the verdict ts is mint_ts(base_idx+1).
        base_idx = _core.ledger_line_count(state_dir)
        now = _core.mint_ts(base_idx + 1)
        now_dt = _core.parse_iso(now)

        # --- gate_progress update + contract completeness ---
        hours_since_prev = None
        if verdict == "pass":
            if gate_id == "G3":
                # G3 streak fields belong ONLY to the primary quiz (§6.2): spacing is
                # measured between the two quiz passes, never against a teach-back.
                prev_ts = gp.get("last_pass_ts")
                if prev_ts:
                    hours_since_prev = (now_dt - _core.parse_iso(prev_ts)).total_seconds() / 3600.0
                gp["consecutive_passes"] += 1
                if drawn_ids:
                    gp["asked_item_ids"] = list(dict.fromkeys(gp["asked_item_ids"] + drawn_ids))
                scores["consecutive_passes"] = gp["consecutive_passes"]
                # mastery only fires when the reaching pass is >= 24 h after the prior one
                if gp["consecutive_passes"] >= 2 and (hours_since_prev is None or hours_since_prev < 24):
                    gp["consecutive_passes"] = 1  # record the pass but not a mastery streak (§6.4)
                    scores["consecutive_passes"] = 1
                gp["last_pass_ts"] = now
            if is_teach_back:
                gp["teach_back_passed"] = True  # teach-back: flag only; never touches the G3 streak
            concept["last_pass_ts"] = now  # most-recent pass of any kind feeds the §5 SR gap
        else:
            if gate_id == "G3":
                gp["consecutive_passes"] = 0

        if is_teach_back:
            # teach-back attempt: primary mastery must come from prior primary attempts
            primary_done = _primary_mastered(binding, gp, _core.read_ledger(state_dir), concept_id, llm_enabled)
        elif gate_id == "G3":
            # this attempt is the primary quiz; consecutive>=2 implies the 24 h rule held
            primary_done = gp["consecutive_passes"] >= 2
        else:
            # single-pass primary (G1/G2/G4): THIS pass is the completion
            primary_done = verdict == "pass"
        if rec["teach_back"]:
            contract_complete = primary_done and bool(gp.get("teach_back_passed"))
        else:
            contract_complete = primary_done

        # --- VerdictRecord (ch.6) ---
        gate_version = definition.get("key_version") or definition.get("rubric_version")
        record = {
            "gate_id": gate_id, "gate_version": gate_version, "attempt_id": attempt_id,
            "concept_id": concept_id, "scores": scores, "verdict": verdict,
            "evidence": {
                "artifact_text": reply_text, "artifact_sha256": artifact_sha,
                "verifier": _verifier_descriptor(gate_id, definition, config, recorded_model),
                "details": _details(gate_id, definition, scores, attempt_id, drawn_ids, hours_since_prev),
            },
        }

        _core.append_event(state_dir, "attempt_recorded", concept_id, {
            "attempt_id": attempt_id, "gate_id": gate_id,
            "artifact_text": reply_text, "artifact_sha256": artifact_sha, "outcome": "parsed"})
        verdict_event_id = _core.append_event(state_dir, "verdict_issued", concept_id, record)

        if verdict == "pass":
            vout = _state.t_verdict_pass(state, concept_id, gate_contract_complete=contract_complete, review=review)
        else:
            vout = _state.t_verdict_fail(state, concept_id, review=review, curriculum_target=rec["target_retention_days"])
        if vout[0] == "reject":
            _core.die(vout[1], 1)
        if vout[0] == "moved":
            frm, to = vout[1]
            _core.append_event(state_dir, "state_transition", concept_id, {
                "from": frm, "to": to, "trigger_event_id": verdict_event_id})

        session["pending_gate_id"] = None
        _core.atomic_write_json(state_dir / "state.json", state)
        _emit({"ok": True, "verdict": verdict, "scores": scores,
               "feedback": _feedback(gate_id, scores, verdict), "ledger_event_id": verdict_event_id})
if __name__ == "__main__":
    main()
