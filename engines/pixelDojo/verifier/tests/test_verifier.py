"""Tests for the pixelDojo verifier (Prometor context).

Run from the ecosystem root: python3 -m pytest engines/pixelDojo/verifier/tests -q
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pytest
import yaml

from engines.pixelDojo.verifier import (
    apply_gate,
    check_evidence,
    decide,
    load_evidence,
    load_evidence_ndjson,
    select_evidence,
    verify_and_gate,
)
from engines.pixelDojo.verifier.__main__ import main as cli_main

TODAY = date(2026, 7, 5)


def make_evidence(**overrides) -> dict:
    base = {
        "unit_id": "U0-sonda-rate-limiter-robustness",
        "project": "01_rate_limiter",
        "game": "GATEKEEPER",
        "ts": "2026-06-09T01:24:09.038Z",
        "good_admits": 18,
        "abusive_admitted": 0,
        "abusive_rejected": 8,
        "pass": True,
    }
    base.update(overrides)
    return base


def make_state(**unit_overrides) -> dict:
    unit = {
        "id": "U0-sonda-rate-limiter-robustness",
        "project": "01_rate_limiter",
        "title": "GATEKEEPER: token-bucket rate limiter robustness",
        "state": "evaluating",
        "retry_count": 0,
        "retry_limit": 3,
        "attempt_file": "learner/attempts/attempt-1.md",
        "evidence_file": "engines/pixelDojo/.logs/last_run_evidence.json",
    }
    unit.update(unit_overrides)
    return {
        "version": 2,
        "system": "agora-continuum",
        "learner": {"id": "test-learner", "level": "intermediate"},
        "empirical_gates": {
            "learning": {
                "requires_attempt_before_solution": True,
                "mastery_source": "executable_evidence",
            }
        },
        "active_unit": unit,
        "next_action": {"owner": "verifier", "action": "run gate"},
        "units_log": [],
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
    return tmp_path


class TestCheckEvidence:
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
        assert any("inconsistent" in e for e in errors)


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


class TestApplyGate:
    def test_pass_appends_log_and_masters_unit(self, root: Path):
        state = make_state()
        decision = decide(make_evidence(), state["active_unit"], root)
        new_state = apply_gate(state, make_evidence(), decision, TODAY)

        assert len(new_state["units_log"]) == 1
        entry = new_state["units_log"][0]
        assert entry["mastered"] is True
        assert entry["reviews"][-1]["gate_outcome"] == "pass_first_try"
        assert new_state["active_unit"]["state"] == "mastered"
        assert new_state["streak"]["current"] == 1
        assert new_state["streak"]["last_gate_date"] == TODAY
        # producer's original state untouched (pure function)
        assert state["units_log"] == []

    def test_fail_increments_retry_and_keeps_evaluating(self, root: Path):
        state = make_state()
        evidence = make_evidence(**{"pass": False})
        decision = decide(evidence, state["active_unit"], root)
        new_state = apply_gate(state, evidence, decision, TODAY)

        assert new_state["units_log"][0]["mastered"] is False
        assert new_state["active_unit"]["state"] == "evaluating"
        assert new_state["active_unit"]["retry_count"] == 1
        assert new_state["streak"]["current"] == 0  # failed gate never extends streak

    def test_ineligible_decision_raises(self, root: Path):
        state = make_state()
        evidence = make_evidence(unit_id="U9-other")
        decision = decide(evidence, state["active_unit"], root)
        with pytest.raises(ValueError, match="not eligible"):
            apply_gate(state, evidence, decision, TODAY)


class TestEndToEnd:
    def test_verify_and_gate_persists_state(self, root: Path):
        state_path = root / "learner" / "learning_state.yaml"
        state_path.write_text(yaml.safe_dump(make_state(), sort_keys=False), encoding="utf-8")
        evidence_path = root / "evidence.json"
        evidence_path.write_text(json.dumps(make_evidence()), encoding="utf-8")

        decision = verify_and_gate(root, evidence_path, today=TODAY)
        assert decision.ok and decision.passed

        persisted = yaml.safe_load(state_path.read_text(encoding="utf-8"))
        assert persisted["active_unit"]["state"] == "mastered"
        assert len(persisted["units_log"]) == 1

    def test_dry_run_writes_nothing(self, root: Path):
        state_path = root / "learner" / "learning_state.yaml"
        original = yaml.safe_dump(make_state(), sort_keys=False)
        state_path.write_text(original, encoding="utf-8")
        evidence_path = root / "evidence.json"
        evidence_path.write_text(json.dumps(make_evidence()), encoding="utf-8")

        decision = verify_and_gate(root, evidence_path, today=TODAY, dry_run=True)
        assert decision.ok
        assert state_path.read_text(encoding="utf-8") == original

    def test_rejects_evidence_for_wrong_unit(self, root: Path):
        state_path = root / "learner" / "learning_state.yaml"
        state_path.write_text(yaml.safe_dump(make_state(), sort_keys=False), encoding="utf-8")
        evidence_path = root / "evidence.json"
        evidence_path.write_text(json.dumps(make_evidence(unit_id="U9-other")), encoding="utf-8")

        decision = verify_and_gate(root, evidence_path, today=TODAY)
        assert not decision.ok

    def test_load_evidence_reads_real_shape(self, root: Path):
        evidence_path = root / "evidence.json"
        evidence_path.write_text(json.dumps(make_evidence()), encoding="utf-8")
        assert load_evidence(evidence_path)["game"] == "GATEKEEPER"


# --- NDJSON evidence contract (pixel-quest/.logs/evidence.ndjson) -------------


def make_ndjson_record(**overrides) -> dict:
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


def write_ndjson(path: Path, records: list[dict]) -> Path:
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

    def test_metrics_without_kind_rejected(self, root: Path):
        errors = check_evidence(
            make_ndjson_record(metrics={"advanced": 5}),
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


class TestNdjsonEndToEnd:
    def _write_state(self, root: Path, **unit_overrides) -> Path:
        state_path = root / "learner" / "learning_state.yaml"
        state_path.write_text(
            yaml.safe_dump(make_state(**unit_overrides), sort_keys=False), encoding="utf-8"
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
        gate_review = persisted["units_log"][0]["reviews"][-1]
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
            yaml.safe_dump(make_state(**unit_overrides), sort_keys=False), encoding="utf-8"
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
