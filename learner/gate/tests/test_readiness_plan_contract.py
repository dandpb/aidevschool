"""Observable gate obligations from readiness plan criteria 1–7."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest
import yaml

from learner.gate import verify_and_gate
from learner.gate.__main__ import main as cli_main
from learner.gate.security import canonical_evidence_digest
from learner.substrate import load_and_validate

import test_gate as tg


@pytest.fixture
def root(tmp_path: Path) -> Path:
    resolved = tmp_path.resolve()
    attempt = resolved / "learner" / "attempts" / "attempt-1.md"
    attempt.parent.mkdir(parents=True)
    attempt.write_text("# learner attempt\n", encoding="utf-8")
    return resolved


def _write_state(root: Path, evidence_path: Path) -> Path:
    path = root / "learner" / "learning_state.yaml"
    path.write_text(
        yaml.safe_dump(
            tg.make_state(root, evidence_file=str(evidence_path)), sort_keys=False
        ),
        encoding="utf-8",
    )
    return path


def _snapshot(root: Path) -> dict[str, bytes]:
    return {
        path.relative_to(root).as_posix(): path.read_bytes()
        for path in root.rglob("*")
        if path.is_file()
    }


def _assert_unconsumed(path: Path) -> None:
    state = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert state["active_unit"]["state"] == "evaluating"
    assert state["active_unit"]["retry_count"] == 0
    assert state["units_log"][0]["mastered"] is False
    assert state["units_log"][0]["reviews"] == []


@pytest.mark.parametrize(
    "evidence_factory", [tg.make_evidence, tg.make_ndjson_record],
    ids=["gatekeeper", "pixelquest"],
)
def test_no_receipt_preserves_state(root: Path, evidence_factory):
    evidence = evidence_factory()
    path = tg.write_ndjson(root / "evidence.ndjson", [evidence])
    state_path = _write_state(root, path)
    before = _snapshot(root)

    decision = verify_and_gate(root, path, today=tg.TODAY)

    assert decision is not None
    assert decision.ok is False and decision.passed is False
    assert decision.receipt is None
    assert any("digest-bound verifier receipt" in error for error in decision.errors)
    assert _snapshot(root) == before
    _assert_unconsumed(state_path)


@pytest.mark.parametrize(
    "violation,expected",
    [
        ("other_digest", "evidence_digest does not match"),
        ("outside_path", "learner/verifier_receipts"),
        ("context_not_isolated", "context_isolated is not true"),
        ("producer_embedded", "embedded verifier"),
    ],
)
@pytest.mark.parametrize(
    "evidence_factory", [tg.make_evidence, tg.make_ndjson_record],
    ids=["gatekeeper", "pixelquest"],
)
def test_invalid_receipt_preserves_state(
    root: Path, evidence_factory, violation: str, expected: str
):
    evidence = evidence_factory()
    receipt_overrides = {}
    if violation == "other_digest":
        receipt_overrides["evidence_digest"] = canonical_evidence_digest(
            evidence_factory(unit_id="another-unit")
        )
    if violation == "context_not_isolated":
        receipt_overrides["context_isolated"] = False
    if violation == "producer_embedded":
        evidence["verifier"] = {"verdict": "PASS", "context_isolated": True}
    path = tg.write_ndjson(root / "evidence.ndjson", [evidence])
    state_path = _write_state(root, path)
    receipt_path = tg.write_verifier_receipt(root, evidence, **receipt_overrides)
    if violation == "outside_path":
        outside = root / "producer-receipt.json"
        outside.write_bytes(receipt_path.read_bytes())
        receipt_path = outside
    before = _snapshot(root)

    if violation == "outside_path":
        with pytest.raises(ValueError, match=expected):
            verify_and_gate(
                root, path, today=tg.TODAY, verifier_receipt_path=receipt_path
            )
    else:
        decision = verify_and_gate(
            root, path, today=tg.TODAY, verifier_receipt_path=receipt_path
        )
        assert decision is not None and not decision.ok and not decision.passed
        assert decision.receipt is None
        assert any(expected in error for error in decision.errors)

    assert _snapshot(root) == before
    _assert_unconsumed(state_path)


def test_retry_receipt_persists_source(root: Path):
    evidence = tg.make_evidence(**{"pass": False})
    path = root / "evidence.json"
    path.write_text(json.dumps(evidence), encoding="utf-8")
    state_path = _write_state(root, path)
    failed = verify_and_gate(root, path, today=tg.TODAY)
    assert failed is not None and failed.ok and not failed.passed
    after_failure = load_and_validate(state_path)
    assert after_failure["active_unit"]["state"] == "evaluating"
    assert after_failure["active_unit"]["retry_count"] == 1
    first_review = after_failure["units_log"][0]["reviews"][0]
    assert first_review["gate_outcome"] == "fail"

    # A legitimate retry carries a new learner attempt and a new run.
    (root / "learner" / "attempts" / "attempt-1.md").write_text(
        "# learner attempt\nCorrected the failed implementation.\n", encoding="utf-8"
    )
    retried = tg.make_evidence(ts="2026-07-05T13:00:00Z", run_id="run-002")
    path.write_text(json.dumps(retried), encoding="utf-8")
    receipt_path = tg.write_verifier_receipt(
        root, retried, source="readiness-independent-retry-verifier"
    )

    decision = verify_and_gate(
        root, path, today=tg.TODAY, verifier_receipt_path=receipt_path
    )

    assert decision is not None and decision.ok and decision.passed
    assert decision.gate_outcome == "pass_retried"
    persisted = load_and_validate(state_path)
    assert persisted["active_unit"]["state"] == "mastered"
    assert persisted["active_unit"]["retry_count"] == 1
    reviews = persisted["units_log"][0]["reviews"]
    assert len(reviews) == 2 and reviews[0] == first_review
    assert reviews[1]["gate_outcome"] == "pass_retried"
    assert reviews[1]["evidence_verifier_source"] == (
        "readiness-independent-retry-verifier"
    )
    assert reviews[1]["evidence_digest"] == canonical_evidence_digest(retried)
    assert reviews[1]["evidence_ts"] == retried["ts"]


def test_nothing_to_grade_cli_does_not_write(root: Path, capsys):
    path = tg.write_ndjson(
        root / "evidence.ndjson",
        [tg.make_ndjson_record(unit_id="other-unit", project="02_key_value_store")],
    )
    state_path = _write_state(root, path)
    before = _snapshot(root)

    assert cli_main(["--root", str(root), "--evidence", str(path)]) == 0

    assert "NOTHING TO GRADE" in capsys.readouterr().out
    assert _snapshot(root) == before
    _assert_unconsumed(state_path)


def test_committed_multirecord_backing_revalidates(root: Path):
    older = tg.make_ndjson_record(ts="2026-07-04T12:00:00Z")
    active = tg.make_ndjson_record(encounter_id="latest-active-encounter")
    other = tg.make_ndjson_record(unit_id="other-unit", project="02_key_value_store")
    path = tg.write_ndjson(root / "evidence.ndjson", [older, active, other])
    state_path = _write_state(root, path)
    receipt_path = tg.write_verifier_receipt(root, active)
    decision = verify_and_gate(
        root, path, today=tg.TODAY, verifier_receipt_path=receipt_path
    )
    assert decision is not None and decision.ok and decision.passed

    for args in (
        ["init", "--quiet"],
        ["add", "learner", "evidence.ndjson"],
        ["-c", "user.name=Readiness test", "-c", "user.email=test@example.invalid",
         "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null",
         "commit", "--quiet", "-m", "Temporary test backing"],
    ):
        subprocess.run(["git", *args], cwd=root, check=True, capture_output=True)

    persisted = load_and_validate(state_path)
    assert persisted["active_unit"]["state"] == "mastered"
    review = persisted["units_log"][0]["reviews"][-1]
    assert review["evidence_ts"] == active["ts"]
    assert review["evidence_digest"] == canonical_evidence_digest(active)


@pytest.mark.parametrize(
    "replay_kind,expected",
    [
        ("same_record", "stale or duplicate"),
        ("new_timestamp", "digest replay"),
        ("producer_nonce", "attempt/scenario replay"),
        ("changed_payload", "run_id is immutable"),
    ],
)
def test_replay_preserves_consumed_state(root: Path, replay_kind: str, expected: str):
    evidence = tg.make_evidence(**{"pass": False})
    if replay_kind == "producer_nonce":
        evidence.pop("run_id")
    path = root / "evidence.json"
    path.write_text(json.dumps(evidence), encoding="utf-8")
    state_path = _write_state(root, path)
    receipt_path = tg.write_verifier_receipt(root, evidence, verdict="FAIL")
    first = verify_and_gate(
        root, path, today=tg.TODAY, verifier_receipt_path=receipt_path
    )
    assert first is not None and first.ok and not first.passed
    consumed_state = state_path.read_bytes()

    replay = dict(evidence)
    if replay_kind != "same_record":
        replay["ts"] = "2026-07-06T13:00:00Z"
    if replay_kind == "producer_nonce":
        replay["nonce"] = "producer-controlled"
        replay["metrics"] = {"nonce": "producer-controlled"}
    if replay_kind == "changed_payload":
        replay["good_admits"] = 19
    replay_path = root / "replay.json"
    replay_path.write_text(json.dumps(replay), encoding="utf-8")
    receipt_path = tg.write_verifier_receipt(root, replay, verdict="FAIL")
    before = _snapshot(root)

    second = verify_and_gate(
        root, replay_path, today=tg.TODAY, verifier_receipt_path=receipt_path
    )

    assert second is not None and not second.ok and not second.passed
    assert second.receipt is None
    assert any(expected in error for error in second.errors)
    assert _snapshot(root) == before
    assert state_path.read_bytes() == consumed_state
    persisted = yaml.safe_load(consumed_state)
    assert len(persisted["units_log"][0]["reviews"]) == 1
    assert persisted["active_unit"]["retry_count"] == 1
    assert persisted["active_unit"]["state"] == "evaluating"


@pytest.mark.parametrize("has_receipt", [True, False], ids=["positive", "negative"])
def test_dry_run_preserves_all_files(root: Path, capsys, has_receipt: bool):
    evidence = tg.make_evidence()
    path = tg.write_ndjson(root / "evidence.ndjson", [evidence])
    state_path = _write_state(root, path)
    argv = ["--root", str(root), "--evidence", str(path), "--dry-run"]
    if has_receipt:
        receipt_path = tg.write_verifier_receipt(root, evidence)
        argv.extend(["--verifier-receipt", str(receipt_path)])
    before = _snapshot(root)

    assert cli_main(argv) == (0 if has_receipt else 1)

    output = capsys.readouterr().out
    assert ("would be" if has_receipt else "NOT ELIGIBLE") in output
    assert _snapshot(root) == before
    _assert_unconsumed(state_path)
