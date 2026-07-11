from __future__ import annotations

import json
from dataclasses import replace
from datetime import date
from pathlib import Path
from typing import Any

import pytest
import yaml

from learner.gate import (
    check_evidence,
    decide,
    load_evidence,
    load_evidence_ndjson,
    select_evidence,
    verify_and_gate,
)
from learner.gate.__main__ import main as cli_main
from learner.gate.security import canonical_evidence_digest
from learner.gate.verifier_receipt import VerifierReceipt
from learner.substrate import validate
from learner.substrate.gate import transition_gate

TODAY = date(2026, 7, 5)


def make_evidence(**overrides: Any) -> dict[str, Any]:
    base = {
        "unit_id": "U0-sonda-rate-limiter-robustness",
        "project": "01_rate_limiter",
        "game": "GATEKEEPER",
        "ts": "2026-06-09T01:24:09.038Z",
        "good_admits": 18,
        "abusive_admitted": 0,
        "abusive_rejected": 8,
        "run_id": "run-001",
        "attempt_id": "learner/attempts/attempt-1.md",
        "scenario_id": "gatekeeper-rate-limiter",
        "pass": True,
    }
    base.update(overrides)
    return base


def make_verifier_receipt(evidence: dict[str, Any], **overrides: Any) -> VerifierReceipt:
    base = VerifierReceipt(
        verdict="PASS",
        context_isolated=True,
        mutation_score=0.65,
        coverage_core=0.8,
        source="independent-voxel-verifier",
        evidence_digest=canonical_evidence_digest(evidence),
    )
    return replace(base, **overrides)


def write_verifier_receipt(
    root: Path, evidence: dict[str, Any], **overrides: Any
) -> Path:
    receipt = make_verifier_receipt(evidence, **overrides)
    path = root / "learner" / "verifier_receipts" / "receipt.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "verdict": receipt.verdict,
                "context_isolated": receipt.context_isolated,
                "mutation_score": receipt.mutation_score,
                "coverage_core": receipt.coverage_core,
                "source": receipt.source,
                "evidence_digest": receipt.evidence_digest,
            }
        ),
        encoding="utf-8",
    )
    return path


def make_state(root: Path | None = None, **unit_overrides: Any) -> dict[str, Any]:
    attempt_file = (
        str(root / "learner" / "attempts" / "attempt-1.md")
        if root is not None
        else "learner/attempts/attempt-1.md"
    )
    evidence_file = (
        str(root / "evidence-artifact.json")
        if root is not None
        else "engines/pixelDojo/.logs/last_run_evidence.json"
    )
    unit = {
        "id": "U0-sonda-rate-limiter-robustness",
        "project": "01_rate_limiter",
        "title": "GATEKEEPER: token-bucket rate limiter robustness",
        "state": "evaluating",
        "retry_count": 0,
        "retry_limit": 3,
        "attempt_file": attempt_file,
        "evidence_file": evidence_file,
    }
    unit.update(unit_overrides)
    return {
        "version": 2,
        "system": "agora-continuum",
        "learner": {
            "id": "test-learner",
            "level": "intermediate",
            "aidi": {
                "current": 0.34,
                "threshold_amber": 0.6,
                "threshold_red": 0.75,
                "measurement_source": "self_reported",
                "history": [],
            },
        },
        "empirical_gates": {
            "learning": {
                "requires_attempt_before_solution": True,
                "mastery_source": "executable_evidence",
            }
        },
        "active_unit": unit,
        "next_action": {"owner": "verifier", "action": "run gate"},
        "units_log": [
            {
                "unit_id": unit["id"],
                "project": unit["project"],
                "mastered": False,
                "attempt_file": unit["attempt_file"],
                "evidence_file": unit["evidence_file"],
                "reviews": [],
            }
        ],
        "streak": {
            "current": 0,
            "longest": 0,
            "last_gate_date": None,
            "freezes": {"equipped": 2, "max": 2},
        },
    }


@pytest.fixture
def root(tmp_path: Path) -> Path:
    (tmp_path / "learner" / "attempts").mkdir(parents=True)
    (tmp_path / "learner" / "attempts" / "attempt-1.md").write_text("# attempt", encoding="utf-8")
    # Valid game-evidence record on disk: the substrate's _validate_evidence_files
    # (audit #9) requires a gating unit's evidence file to carry a "pass" field
    # or a "verifier" block. An empty {} is rejected once apply_gate appends a
    # gate review and re-validates the state.
    (tmp_path / "evidence-artifact.json").write_text(json.dumps(make_evidence()), encoding="utf-8")
    return tmp_path


class TestCheckEvidence:
    def test_fixture_satisfies_canonical_learner_state_contract(self, root: Path):
        # Given: the legacy verifier fixture
        state = make_state(root)

        # When: the substrate validates the state before an end-to-end gate
        errors = validate(state)

        # Then: the verifier fixture is a valid canonical learner state
        assert errors == []

    def test_valid_evidence_is_eligible(self, root: Path):
        assert check_evidence(make_evidence(), make_state()["active_unit"], root) == []

    def test_missing_required_field_rejected(self, root: Path):
        evidence = make_evidence()
        del evidence["pass"]
        errors = check_evidence(evidence, make_state()["active_unit"], root)
        assert any("'pass'" in e for e in errors)

    def test_unit_mismatch_rejected(self, root: Path):
        errors = check_evidence(
            make_evidence(unit_id="U9-other"), make_state()["active_unit"], root
        )
        assert any("does not match" in e for e in errors)

    def test_missing_attempt_file_rejected(self, root: Path):
        errors = check_evidence(
            make_evidence(),
            make_state(attempt_file="learner/attempts/nope.md")["active_unit"],
            root,
        )
        assert any("attempt file not found" in e for e in errors)

    def test_no_attempt_declared_rejected(self, root: Path):
        errors = check_evidence(
            make_evidence(), make_state(attempt_file=None)["active_unit"], root
        )
        assert any("attempt-before-solution" in e for e in errors)

    def test_wrong_state_rejected(self, root: Path):
        errors = check_evidence(
            make_evidence(), make_state(state="presenting")["active_unit"], root
        )
        assert any("evaluating" in e for e in errors)

    def test_inconsistent_pass_with_abuse_rejected(self, root: Path):
        errors = check_evidence(
            make_evidence(abusive_admitted=3), make_state()["active_unit"], root
        )
        assert any("claimed-versus-verified disagreement" in e for e in errors)

    def test_nested_disqualifying_metric_overrides_producer_pass(self, root: Path):
        errors = check_evidence(
            make_evidence(metrics={"ordering_violations": 1}),
            make_state()["active_unit"],
            root,
        )
        assert any("claimed-versus-verified disagreement" in error for error in errors)

    def test_producer_pass_without_known_rubric_or_verifier_is_rejected(self, root: Path):
        # Given: a producer claims success with an unrecognized metric shape
        evidence = make_evidence(
            game="UNKNOWN",
            metrics={"kind": "unknown", "score": 100},
        )

        # When: the independent gate evaluates it
        errors = check_evidence(evidence, make_state()["active_unit"], root)

        # Then: producer pass is not treated as independent proof
        assert any("independent verifier" in error for error in errors)

    def test_embedded_verifier_cannot_override_producer_judgment(self, root: Path):
        # Given: producer evidence embeds a verifier-looking block
        evidence = make_evidence(
            **{"pass": False},
            verifier={
                "verdict": "PASS",
                "context_isolated": True,
                "mutation_score": 0.65,
                "coverage_core": 0.8,
            },
        )

        # When: the gate checks eligibility
        errors = check_evidence(evidence, make_state()["active_unit"], root)

        # Then: an embedded producer-controlled block is not an authority
        assert any("embedded verifier" in error for error in errors)

    def test_incomplete_verifier_pass_is_rejected(self, root: Path):
        evidence = make_evidence(
            verifier={"verdict": "PASS", "context_isolated": True}
        )
        errors = check_evidence(evidence, make_state()["active_unit"], root)
        assert any("embedded verifier" in error for error in errors)

    def test_below_threshold_verifier_pass_is_rejected(self, root: Path):
        evidence = make_evidence(
            verifier={
                "verdict": "PASS",
                "context_isolated": True,
                "mutation_score": 0.64,
                "coverage_core": 0.8,
            }
        )
        errors = check_evidence(evidence, make_state()["active_unit"], root)
        assert any("embedded verifier" in error for error in errors)

    @pytest.mark.parametrize(
        "metrics",
        [
            {
                "kind": "pixelquest-token-bucket",
                "good_admits": 7,
                "abusive_admitted": 0,
                "overheated": False,
            },
            {
                "kind": "pixelquest-route-health",
                "routed": 5,
                "bad_routes": 1,
                "good_rejected": 0,
                "overheated": False,
            },
            {
                "kind": "pixelquest-policy-gate",
                "allowed": 5,
                "policy_leaks": 0,
                "false_denies": 1,
                "overheated": False,
            },
            {
                "kind": "pixelquest-sequence-flow",
                "advanced": 5,
                "skipped_required": 0,
                "guards_missed": 1,
                "overheated": False,
            },
            {
                "kind": "pixelquest-task-queue",
                "processed": 8,
                "poison_retried": 4,
                "legit_retried": 0,
                "backpressure_peak": 4,
                "overheated": False,
            },
        ],
    )
    def test_known_rubric_threshold_violation_rejects_producer_pass(
        self, root: Path, metrics: dict[str, Any]
    ):
        errors = check_evidence(
            make_evidence(game="PixelDojo Quest", metrics=metrics),
            make_state()["active_unit"],
            root,
        )
        assert any("claimed-versus-verified disagreement" in error for error in errors)

    @pytest.mark.parametrize(
        "game",
        [
            "WAREHOUSE",
            "WORMHOLE",
            "RELAY STATION",
            "PIPELINE PLANT",
            "CHECKPOINT CITY",
            "TIMELINE TOWER",
            "DOCKING BAY",
            "HASH RING",
            "AIR TRAFFIC",
            "MISSION CONTROL",
            "BREAKER GRID",
            "RIVER DELTA",
            "OBSERVATORY",
            "FREIGHT YARD",
            "LIGHTHOUSE NETWORK",
            "STACKS",
        ],
    )
    def test_voxel_fleet_requires_separate_independent_verifier_receipt(
        self, root: Path, game: str
    ):
        base = make_evidence(
            source="voxeldojo",
            game=game,
            metrics={"completed": 1},
        )
        producer_only_errors = check_evidence(base, make_state()["active_unit"], root)
        assert any("independent verifier" in error for error in producer_only_errors)

        embedded_only = {
            **base,
            "verifier": {
                "verdict": "PASS",
                "context_isolated": True,
                "mutation_score": 0.65,
                "coverage_core": 0.8,
            },
        }
        embedded_errors = check_evidence(
            embedded_only, make_state()["active_unit"], root
        )
        assert any("embedded verifier" in error for error in embedded_errors)

        separate_receipt = make_verifier_receipt(base)
        assert (
            check_evidence(
                base,
                make_state()["active_unit"],
                root,
                verifier_receipt=separate_receipt,
            )
            == []
        )

    def test_separate_receipt_digest_must_match_producer_evidence(self, root: Path):
        evidence = make_evidence(source="voxeldojo", game="WAREHOUSE")
        receipt = make_verifier_receipt(evidence, evidence_digest="0" * 64)

        errors = check_evidence(
            evidence,
            make_state()["active_unit"],
            root,
            verifier_receipt=receipt,
        )

        assert any("evidence_digest" in error and "does not match" in error for error in errors)

    def test_canonical_digest_excludes_timestamp_and_embedded_verifier(self):
        evidence = make_evidence(source="voxeldojo", game="WAREHOUSE")
        changed = {
            **evidence,
            "ts": "2026-07-10T00:00:00Z",
            "verifier": {"verdict": "PASS", "source": "producer-spoof"},
        }

        assert canonical_evidence_digest(changed) == canonical_evidence_digest(evidence)

    def test_canonical_digest_binds_arbitrary_voxel_metrics(self):
        evidence = make_evidence(
            source="voxeldojo",
            game="WAREHOUSE",
            metrics={"keys_stored": 4, "accuracy": 0.99},
        )
        changed = {
            **evidence,
            "metrics": {"keys_stored": 999, "accuracy": 0.99},
        }

        assert canonical_evidence_digest(changed) != canonical_evidence_digest(evidence)

    def test_substrate_rejects_embedded_verifier_in_producer_artifact(
        self, root: Path
    ):
        evidence = make_evidence(
            source="voxeldojo",
            game="WAREHOUSE",
            verifier={
                "verdict": "PASS",
                "context_isolated": True,
                "mutation_score": 0.65,
                "coverage_core": 0.8,
                "source": "producer-spoof",
            },
        )
        (root / "evidence-artifact.json").write_text(
            json.dumps(evidence), encoding="utf-8"
        )
        state = make_state(root, state="mastered")
        state["units_log"][0]["mastered"] = True
        state["units_log"][0]["reviews"] = [
            {
                "date": TODAY,
                "event": "gate",
                "rating": "good",
                "gate_outcome": "pass_first_try",
                "evidence_ts": evidence["ts"],
            }
        ]

        errors = validate(state, root)

        assert any("producer-controlled 'verifier'" in error for error in errors)

    def test_naive_timestamp_is_rejected(self, root: Path):
        errors = check_evidence(
            make_evidence(ts="2026-07-05T12:00:00"), make_state()["active_unit"], root
        )
        assert any("timezone" in error for error in errors)

    def test_attempt_outside_learner_attempts_is_rejected(self, root: Path):
        outside = root / "outside.md"
        outside.write_text("attempt", encoding="utf-8")
        errors = check_evidence(
            make_evidence(attempt_id="outside.md"),
            make_state(attempt_file="outside.md")["active_unit"],
            root,
        )
        assert any("learner/attempts" in error for error in errors)

    def test_attempt_symlink_escape_is_rejected(self, root: Path):
        outside = root / "outside.md"
        outside.write_text("attempt", encoding="utf-8")
        link = root / "learner" / "attempts" / "escape.md"
        link.symlink_to(outside)
        errors = check_evidence(
            make_evidence(attempt_id="learner/attempts/escape.md"),
            make_state(attempt_file="learner/attempts/escape.md")["active_unit"],
            root,
        )
        assert any("symlink" in error for error in errors)

    def test_attempt_directory_is_rejected(self, root: Path):
        directory = root / "learner" / "attempts" / "not-a-file"
        directory.mkdir()
        errors = check_evidence(
            make_evidence(attempt_id="learner/attempts/not-a-file"),
            make_state(attempt_file="learner/attempts/not-a-file")["active_unit"],
            root,
        )
        assert any("regular file" in error for error in errors)


class TestDecide:
    def test_pass_first_try(self, root: Path):
        d = decide(make_evidence(), make_state()["active_unit"], root)
        assert d.ok and d.passed
        assert d.gate_outcome == "pass_first_try" and d.rating == "good"

    def test_pass_after_retry(self, root: Path):
        d = decide(make_evidence(), make_state(retry_count=1)["active_unit"], root)
        assert d.gate_outcome == "pass_retried" and d.rating == "hard"

    def test_failed_run_gates_to_fail(self, root: Path):
        d = decide(make_evidence(**{"pass": False}), make_state()["active_unit"], root)
        assert d.ok and not d.passed
        assert d.gate_outcome == "fail" and d.rating == "again"

    def test_separate_verifier_receipt_controls_outcome(self, root: Path):
        evidence = make_evidence(
            **{"pass": False},
        )
        decision = decide(
            evidence,
            make_state()["active_unit"],
            root,
            verifier_receipt=make_verifier_receipt(evidence),
        )
        assert decision.ok and decision.passed


class TestApplyGate:
    def test_pass_updates_existing_unit_log_and_masters_unit(self, root: Path):
        # Given: the active unit is already registered in the canonical history
        state = make_state(root)
        decision = decide(make_evidence(), state["active_unit"], root)
        assert decision.receipt is not None

        # When: its eligible evidence is gated
        new_state = transition_gate(
            state,
            receipt=decision.receipt,
            passed=decision.passed,
            gate_outcome=decision.gate_outcome,
            rating=decision.rating,
            today=TODAY,
            root=root,
        )

        # Then: the existing history entry records the outcome without a duplicate unit
        matching_entries = [
            entry
            for entry in new_state["units_log"]
            if entry["unit_id"] == state["active_unit"]["id"]
        ]
        assert len(matching_entries) == 1
        entry = matching_entries[0]
        assert entry["mastered"] is True
        assert entry["reviews"][-1]["gate_outcome"] == "pass_first_try"
        assert entry["reviews"][-1]["evidence_digest"] == decision.receipt.digest
        assert entry["reviews"][-1]["evidence_run_id"] == "run-001"
        assert entry["reviews"][-1]["evidence_attempt_id"] == (
            "learner/attempts/attempt-1.md"
        )
        assert len(entry["reviews"][-1]["evidence_attempt_digest"]) == 64
        assert entry["reviews"][-1]["evidence_scenario_id"] == (
            "gatekeeper-rate-limiter"
        )
        assert new_state["active_unit"]["state"] == "mastered"
        assert new_state["streak"]["current"] == 1
        assert new_state["streak"]["last_gate_date"] == TODAY
        # producer's original state untouched (pure function)
        assert len(state["units_log"]) == 1

    def test_fail_increments_retry_and_keeps_evaluating(self, root: Path):
        state = make_state(root)
        evidence = make_evidence(**{"pass": False})
        decision = decide(evidence, state["active_unit"], root)
        assert decision.receipt is not None
        new_state = transition_gate(
            state,
            receipt=decision.receipt,
            passed=decision.passed,
            gate_outcome=decision.gate_outcome,
            rating=decision.rating,
            today=TODAY,
            root=root,
        )

        assert len(new_state["units_log"]) == 1
        assert new_state["units_log"][0]["mastered"] is False
        assert new_state["units_log"][0]["reviews"][-1]["gate_outcome"] == "fail"
        assert new_state["active_unit"]["state"] == "evaluating"
        assert new_state["active_unit"]["retry_count"] == 1
        assert new_state["streak"]["current"] == 0  # failed gate never extends streak

class TestEndToEnd:
    def test_verify_and_gate_persists_state(self, root: Path):
        state_path = root / "learner" / "learning_state.yaml"
        state_path.write_text(yaml.safe_dump(make_state(root), sort_keys=False), encoding="utf-8")
        evidence_path = root / "evidence.json"
        evidence_path.write_text(json.dumps(make_evidence()), encoding="utf-8")

        decision = verify_and_gate(root, evidence_path, today=TODAY)
        assert decision is not None
        assert decision.ok and decision.passed

        persisted = yaml.safe_load(state_path.read_text(encoding="utf-8"))
        assert persisted["active_unit"]["state"] == "mastered"
        assert len(persisted["units_log"]) == 1

    def test_dry_run_writes_nothing(self, root: Path):
        state_path = root / "learner" / "learning_state.yaml"
        original = yaml.safe_dump(make_state(root), sort_keys=False)
        state_path.write_text(original, encoding="utf-8")
        evidence_path = root / "evidence.json"
        evidence_path.write_text(json.dumps(make_evidence()), encoding="utf-8")

        decision = verify_and_gate(root, evidence_path, today=TODAY, dry_run=True)
        assert decision is not None
        assert decision.ok
        assert state_path.read_text(encoding="utf-8") == original

    def test_rejects_evidence_for_wrong_unit(self, root: Path):
        state_path = root / "learner" / "learning_state.yaml"
        state_path.write_text(yaml.safe_dump(make_state(root), sort_keys=False), encoding="utf-8")
        evidence_path = root / "evidence.json"
        evidence_path.write_text(json.dumps(make_evidence(unit_id="U9-other")), encoding="utf-8")

        decision = verify_and_gate(root, evidence_path, today=TODAY)
        assert decision is not None
        assert not decision.ok

    def test_load_evidence_reads_real_shape(self, root: Path):
        evidence_path = root / "evidence.json"
        evidence_path.write_text(json.dumps(make_evidence()), encoding="utf-8")
        assert load_evidence(evidence_path)["game"] == "GATEKEEPER"

    def test_voxel_pass_requires_receipt_from_confined_directory(self, root: Path):
        evidence = make_evidence(source="voxeldojo", game="WAREHOUSE")
        evidence_path = root / "evidence.json"
        evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
        state_path = root / "learner" / "learning_state.yaml"
        state_path.write_text(
            yaml.safe_dump(
                make_state(root, evidence_file=str(evidence_path)), sort_keys=False
            ),
            encoding="utf-8",
        )
        receipt_path = write_verifier_receipt(root, evidence)

        decision = verify_and_gate(
            root,
            evidence_path,
            today=TODAY,
            verifier_receipt_path=receipt_path,
        )

        assert decision is not None and decision.ok and decision.passed
        persisted = yaml.safe_load(state_path.read_text(encoding="utf-8"))
        assert (
            persisted["units_log"][0]["reviews"][-1]["evidence_verifier_source"]
            == "independent-voxel-verifier"
        )
        evidence_path.write_text(
            json.dumps({**evidence, "metrics": {"keys_stored": 999}}),
            encoding="utf-8",
        )
        assert any(
            "does not match the canonical digest" in error
            for error in validate(persisted, root)
        )

    def test_receipt_outside_confined_directory_is_rejected(self, root: Path):
        state_path = root / "learner" / "learning_state.yaml"
        state_path.write_text(
            yaml.safe_dump(make_state(root), sort_keys=False), encoding="utf-8"
        )
        evidence = make_evidence(source="voxeldojo", game="WAREHOUSE")
        evidence_path = root / "evidence.json"
        evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
        outside_receipt = root / "receipt.json"
        valid_receipt = write_verifier_receipt(root, evidence)
        outside_receipt.write_text(valid_receipt.read_text(encoding="utf-8"), encoding="utf-8")

        with pytest.raises(ValueError, match="learner/verifier_receipts"):
            verify_and_gate(
                root,
                evidence_path,
                today=TODAY,
                verifier_receipt_path=outside_receipt,
            )


# --- NDJSON evidence contract (pixel-quest/.logs/evidence.ndjson) -------------


def make_ndjson_record(**overrides: Any) -> dict[str, Any]:
    """A record in the shape the pixel-quest emitter writes (EVIDENCE_CONTRACT.md)."""
    base = {
        "source": "pixelquest",
        "unit_id": "U0-sonda-rate-limiter-robustness",
        "project": "01_rate_limiter",
        "encounter_id": "encounter-agent-quest-01",
        "game": "PixelDojo Quest",
        "ts": "2026-07-05T12:00:00.000Z",
        "pass": True,
        "metrics": {
            "kind": "pixelquest-sequence-flow",
            "advanced": 5,
            "held": 5,
            "skipped_required": 0,
            "guards_missed": 0,
            "heat_peak": 0,
            "overheated": False,
        },
    }
    base.update(overrides)
    return base


def write_ndjson(path: Path, records: list[dict[str, Any]]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in records), encoding="utf-8")
    return path


class TestLoadEvidenceNdjson:
    def test_parses_valid_records_in_order(self, root: Path):
        records = [
            make_ndjson_record(ts="2026-07-05T10:00:00.000Z"),
            make_ndjson_record(unit_id="U-02_key_value_store", project="02_key_value_store"),
        ]
        path = write_ndjson(root / "evidence.ndjson", records)
        loaded = load_evidence_ndjson(path)
        assert [r["unit_id"] for r in loaded] == [r["unit_id"] for r in records]

    def test_blank_lines_tolerated(self, root: Path):
        path = root / "evidence.ndjson"
        path.write_text(
            "\n" + json.dumps(make_ndjson_record()) + "\n\n", encoding="utf-8"
        )
        assert len(load_evidence_ndjson(path)) == 1

    def test_empty_file_yields_no_records(self, root: Path):
        path = root / "evidence.ndjson"
        path.write_text("", encoding="utf-8")
        assert load_evidence_ndjson(path) == []

    def test_malformed_line_rejects_whole_file(self, root: Path):
        path = root / "evidence.ndjson"
        path.write_text(
            json.dumps(make_ndjson_record()) + "\n{not json\n", encoding="utf-8"
        )
        with pytest.raises(ValueError, match="line 2"):
            load_evidence_ndjson(path)

    def test_non_object_line_rejected(self, root: Path):
        path = root / "evidence.ndjson"
        path.write_text('["a", "list"]\n', encoding="utf-8")
        with pytest.raises(ValueError, match="not a JSON object"):
            load_evidence_ndjson(path)


class TestSelectEvidence:
    def test_picks_latest_record_for_active_unit(self):
        first = make_ndjson_record(ts="2026-07-05T10:00:00.000Z")
        other = make_ndjson_record(unit_id="U-02_key_value_store")
        latest = make_ndjson_record(ts="2026-07-05T11:00:00.000Z")
        unit = make_state()["active_unit"]
        assert select_evidence([first, other, latest], unit) is latest

    def test_none_when_no_record_matches(self):
        records = [make_ndjson_record(unit_id="U-02_key_value_store")]
        assert select_evidence(records, make_state()["active_unit"]) is None


class TestGateIntegrity:
    def test_stub_attempt_rejected(self, root: Path):
        (root / "learner" / "attempts" / "attempt-1.md").write_text("  \n", encoding="utf-8")
        errors = check_evidence(make_evidence(), make_state()["active_unit"], root)
        assert any("stub" in e for e in errors)

    def test_metrics_flat_without_kind_allowed(self, root: Path):
        # Voxel-style flat counters need no kind discriminator.
        errors = check_evidence(
            make_ndjson_record(metrics={"advanced": 5}),
            make_state()["active_unit"],
            root,
        )
        assert not any("kind" in e for e in errors)

    def test_metrics_empty_kind_rejected(self, root: Path):
        errors = check_evidence(
            make_ndjson_record(metrics={"kind": "", "advanced": 5}),
            make_state()["active_unit"],
            root,
        )
        assert any("kind" in e for e in errors)

    def test_invalid_ts_rejected(self, root: Path):
        errors = check_evidence(
            make_evidence(ts="not-a-timestamp"), make_state()["active_unit"], root
        )
        assert any("ISO-8601" in e for e in errors)

    def test_duplicate_evidence_rejected(self, root: Path):
        """A record already consumed by a gate cannot be graded twice."""
        evidence = make_evidence()
        gated_log = [
            {
                "unit_id": evidence["unit_id"],
                "mastered": False,
                "reviews": [
                    {
                        "date": TODAY,
                        "event": "gate",
                        "rating": "again",
                        "gate_outcome": "fail",
                        "evidence_ts": evidence["ts"],
                    }
                ],
            }
        ]
        errors = check_evidence(evidence, make_state()["active_unit"], root, gated_log)
        assert any("stale or duplicate" in e for e in errors)

    def test_stale_evidence_rejected(self, root: Path):
        gated_log = [
            {
                "unit_id": "U0-sonda-rate-limiter-robustness",
                "mastered": False,
                "reviews": [{"event": "gate", "evidence_ts": "2026-07-01T00:00:00.000Z"}],
            }
        ]
        errors = check_evidence(
            make_evidence(ts="2026-06-30T00:00:00.000Z"),
            make_state()["active_unit"],
            root,
            gated_log,
        )
        assert any("stale or duplicate" in e for e in errors)

    def test_fresh_evidence_after_previous_gate_is_eligible(self, root: Path):
        gated_log = [
            {
                "unit_id": "U0-sonda-rate-limiter-robustness",
                "mastered": False,
                "reviews": [{"event": "gate", "evidence_ts": "2026-06-09T01:24:09.038Z"}],
            }
        ]
        errors = check_evidence(
            make_evidence(ts="2026-07-05T09:00:00.000Z"),
            make_state()["active_unit"],
            root,
            gated_log,
        )
        assert errors == []

    def test_same_payload_with_bumped_timestamp_is_rejected_by_digest(self, root: Path):
        evidence = make_evidence(ts="2026-07-06T09:00:00.000Z")
        first = decide(evidence, make_state()["active_unit"], root)
        assert first.receipt is not None
        gated_log = [
            {
                "unit_id": evidence["unit_id"],
                "mastered": False,
                "reviews": [
                    {
                        "event": "gate",
                        "evidence_ts": "2026-07-05T09:00:00.000Z",
                        "evidence_digest": first.receipt.digest,
                        "evidence_run_id": first.receipt.run_id,
                    }
                ],
            }
        ]
        replay = make_evidence(ts="2026-07-07T09:00:00.000Z")
        errors = check_evidence(replay, make_state()["active_unit"], root, gated_log)
        assert any("digest" in error and "replay" in error for error in errors)

    def test_ignored_producer_nonce_cannot_bypass_consumed_evidence(self, root: Path):
        consumed = make_evidence(ts="2026-07-06T09:00:00.000Z")
        consumed.pop("run_id")
        first = decide(consumed, make_state()["active_unit"], root)
        assert first.receipt is not None
        gated_log = [
            {
                "unit_id": consumed["unit_id"],
                "mastered": False,
                "reviews": [
                    {
                        "event": "gate",
                        "evidence_ts": consumed["ts"],
                        "evidence_digest": first.receipt.digest,
                        "evidence_run_id": first.receipt.run_id,
                        "evidence_attempt_id": first.receipt.attempt_id,
                        "evidence_attempt_digest": first.receipt.attempt_digest,
                        "evidence_scenario_id": first.receipt.scenario_id,
                    }
                ],
            }
        ]

        replay = {
            **consumed,
            "ts": "2026-07-07T09:00:00.000Z",
            "nonce": "producer-controlled-but-verifier-ignored",
            "metrics": {"nonce": "nested-and-verifier-ignored"},
        }
        replay_without_history = decide(replay, make_state()["active_unit"], root)
        assert replay_without_history.receipt is not None
        assert replay_without_history.receipt.digest != first.receipt.digest
        assert replay_without_history.receipt.run_id != first.receipt.run_id

        errors = check_evidence(replay, make_state()["active_unit"], root, gated_log)
        assert any("attempt/scenario replay" in error for error in errors)

    def test_same_run_id_with_changed_payload_is_rejected(self, root: Path):
        first = decide(make_evidence(), make_state()["active_unit"], root)
        assert first.receipt is not None
        gated_log = [
            {
                "unit_id": "U0-sonda-rate-limiter-robustness",
                "mastered": False,
                "reviews": [
                    {
                        "event": "gate",
                        "evidence_ts": "2026-07-01T00:00:00Z",
                        "evidence_digest": first.receipt.digest,
                        "evidence_run_id": "run-001",
                    }
                ],
            }
        ]
        changed = make_evidence(ts="2026-07-08T00:00:00Z", good_admits=19)
        errors = check_evidence(changed, make_state()["active_unit"], root, gated_log)
        assert any("run_id" in error and "immutable" in error for error in errors)


class TestNdjsonEndToEnd:
    def _write_state(self, root: Path, **unit_overrides) -> Path:
        state_path = root / "learner" / "learning_state.yaml"
        state_path.write_text(
            yaml.safe_dump(make_state(root, **unit_overrides), sort_keys=False), encoding="utf-8"
        )
        return state_path

    def test_gates_latest_matching_record(self, root: Path):
        state_path = self._write_state(root)
        path = write_ndjson(
            root / "evidence.ndjson",
            [
                make_ndjson_record(unit_id="U-02_key_value_store", project="02_key_value_store"),
                make_ndjson_record(),
            ],
        )
        decision = verify_and_gate(root, path, today=TODAY)
        assert decision is not None and decision.ok and decision.passed

        persisted = yaml.safe_load(state_path.read_text(encoding="utf-8"))
        assert persisted["active_unit"]["state"] == "mastered"
        gate_review = persisted["units_log"][-1]["reviews"][-1]
        assert gate_review["evidence_ts"] == make_ndjson_record()["ts"]

    def test_nothing_to_grade_when_no_record_for_unit(self, root: Path):
        state_path = self._write_state(root)
        original = state_path.read_text(encoding="utf-8")
        path = write_ndjson(
            root / "evidence.ndjson",
            [make_ndjson_record(unit_id="U-02_key_value_store")],
        )
        assert verify_and_gate(root, path, today=TODAY) is None
        assert state_path.read_text(encoding="utf-8") == original  # nothing written

    def test_rejects_ndjson_record_without_real_attempt(self, root: Path):
        state_path = self._write_state(root, attempt_file="learner/attempts/nope.md")
        original = state_path.read_text(encoding="utf-8")
        path = write_ndjson(root / "evidence.ndjson", [make_ndjson_record()])
        decision = verify_and_gate(root, path, today=TODAY)
        assert decision is not None and not decision.ok
        assert any("attempt file not found" in e for e in decision.errors)
        assert state_path.read_text(encoding="utf-8") == original

    def test_rejects_replayed_ndjson_evidence(self, root: Path):
        """Gating the same NDJSON file twice must fail the second time."""
        self._write_state(root, **{"state": "evaluating"})
        path = write_ndjson(
            root / "evidence.ndjson", [make_ndjson_record(**{"pass": False})]
        )
        first = verify_and_gate(root, path, today=TODAY)
        assert first is not None and first.ok and not first.passed

        second = verify_and_gate(root, path, today=TODAY)
        assert second is not None and not second.ok
        assert any("stale or duplicate" in e for e in second.errors)


class TestCli:
    def _setup_root(self, root: Path, **unit_overrides) -> Path:
        state_path = root / "learner" / "learning_state.yaml"
        state_path.write_text(
            yaml.safe_dump(make_state(root, **unit_overrides), sort_keys=False), encoding="utf-8"
        )
        return state_path

    def test_no_evidence_file_exits_cleanly(self, root: Path, capsys):
        self._setup_root(root)
        assert cli_main(["--root", str(root)]) == 0
        out = capsys.readouterr().out
        assert "NOTHING TO GRADE" in out and "pnpm run smoke" in out

    def test_unit_not_evaluating_exits_cleanly(self, root: Path, capsys):
        self._setup_root(root, state="mastered")
        assert cli_main(["--root", str(root)]) == 0
        assert "NOTHING TO GRADE" in capsys.readouterr().out

    def test_mastered_unit_explicit_dry_run_rejects_semantic_disagreement(
        self, root: Path, capsys
    ):
        state_path = self._setup_root(root, state="mastered")
        original = state_path.read_text(encoding="utf-8")
        evidence_path = root / "adversarial.json"
        evidence_path.write_text(
            json.dumps(make_evidence(metrics={"ordering_violations": 1})),
            encoding="utf-8",
        )

        exit_code = cli_main(
            ["--root", str(root), "--dry-run", "--evidence", str(evidence_path)]
        )

        assert exit_code == 1
        assert "claimed-versus-verified disagreement" in capsys.readouterr().out
        assert state_path.read_text(encoding="utf-8") == original

    def test_mastered_unit_explicit_dry_run_reports_semantic_pass_without_transition(
        self, root: Path, capsys
    ):
        state_path = self._setup_root(root, state="mastered")
        original = state_path.read_text(encoding="utf-8")
        evidence_path = root / "valid.json"
        evidence_path.write_text(json.dumps(make_evidence()), encoding="utf-8")

        exit_code = cli_main(
            ["--root", str(root), "--dry-run", "--evidence", str(evidence_path)]
        )

        output = capsys.readouterr().out
        assert exit_code == 0
        assert "SEMANTIC PASS" in output
        assert "transition not applicable" in output
        assert state_path.read_text(encoding="utf-8") == original

    def test_mastered_unit_dry_run_validates_separate_receipt_digest(
        self, root: Path, capsys
    ):
        state_path = self._setup_root(root, state="mastered")
        original = state_path.read_text(encoding="utf-8")
        evidence = make_evidence(source="voxeldojo", game="WAREHOUSE")
        evidence_path = root / "voxel.json"
        evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
        receipt_path = write_verifier_receipt(
            root, evidence, evidence_digest="0" * 64
        )

        exit_code = cli_main(
            [
                "--root",
                str(root),
                "--dry-run",
                "--evidence",
                str(evidence_path),
                "--verifier-receipt",
                str(receipt_path),
            ]
        )

        assert exit_code == 1
        assert "evidence_digest does not match" in capsys.readouterr().out
        assert state_path.read_text(encoding="utf-8") == original

    def test_gates_from_default_ndjson_location(self, root: Path, capsys):
        state_path = self._setup_root(root)
        write_ndjson(
            root / "engines" / "pixelDojo" / "pixel-quest" / ".logs" / "evidence.ndjson",
            [make_ndjson_record()],
        )
        assert cli_main(["--root", str(root)]) == 0
        assert "GATE PASS_FIRST_TRY" in capsys.readouterr().out
        persisted = yaml.safe_load(state_path.read_text(encoding="utf-8"))
        assert persisted["active_unit"]["state"] == "mastered"

    def test_rejected_evidence_exits_1(self, root: Path, capsys):
        self._setup_root(root)
        path = write_ndjson(
            root / "evidence.ndjson", [make_ndjson_record(project="99_wrong")]
        )
        assert cli_main(["--root", str(root), "--evidence", str(path)]) == 1
        assert "NOT ELIGIBLE" in capsys.readouterr().out

    def test_malformed_ndjson_exits_1(self, root: Path, capsys):
        self._setup_root(root)
        path = root / "evidence.ndjson"
        path.write_text("{broken\n", encoding="utf-8")
        assert cli_main(["--root", str(root), "--evidence", str(path)]) == 1
        assert "unreadable" in capsys.readouterr().out

    def test_dry_run_writes_nothing(self, root: Path, capsys):
        state_path = self._setup_root(root)
        original = state_path.read_text(encoding="utf-8")
        write_ndjson(
            root / "engines" / "pixelDojo" / "pixel-quest" / ".logs" / "evidence.ndjson",
            [make_ndjson_record()],
        )
        assert cli_main(["--root", str(root), "--dry-run"]) == 0
        assert "would be" in capsys.readouterr().out
        assert state_path.read_text(encoding="utf-8") == original
