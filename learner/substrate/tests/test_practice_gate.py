"""AID-5005 — guided-practice conclusion gate unit tests.

Invariants under test:
- Only a fully verified conclusion produces an FSRS review; every tampered,
  incomplete or unpinned receipt is rejected with an explicit error.
- The rating comes exclusively from RATING_FROM_GATE (attempt 1 → good,
  retry → hard); nothing self-reported reaches the scheduler.
- A practice conclusion never writes mastery and never touches a mastered unit.
- The receipt is digest-bound: tampering with the persisted file is flagged by
  validate() via bound_practice_receipt_violations.
"""

from __future__ import annotations

import hashlib
import json
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

from learner.substrate import load_canonical, validate
from learner.substrate.practice import (
    PRACTICE_GATE_KIND,
    PracticeReceiptError,
    bound_practice_receipt_violations,
    commit_practice_conclusion,
    persist_practice_receipt,
    practice_unit_id,
    transition_practice_conclusion,
    verify_practice_conclusion,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
PRACTICE_PACKAGE = (
    REPO_ROOT / "curriculum" / "sequencia-dev-guiada" / "pg-d01-debug-reproduza"
)


def load_practice() -> dict:
    from learner.substrate.mission_catalog_guided_practice import (
        load_guided_practice_catalog,
    )

    catalog = load_guided_practice_catalog(REPO_ROOT / "curriculum" / "sequencia-dev-guiada")
    assert "pg-d01" in catalog, "canonical pg-d01 package must be loadable"
    return catalog["pg-d01"]


def make_receipt(practice: dict, **overrides: object) -> dict:
    receipt = {
        "schema": "guided-practice-evidence",
        "version": 1,
        "practice_id": practice["practice_id"],
        "content_version": practice["content_version"],
        "family": "graded",
        "phase": "concluida",
        "attempt": 1,
        "concluded_at": "2026-10-17T12:00:00+00:00",
        "step_evidence": ["reproduzi o bug com a fixture", "isolei a causa raiz"],
        "assessments": {
            criterion: {"verdict": "met", "evidence": "diff + teste verde"}
            for criterion in practice["rubric_criteria"]
        },
        "takeaway": {"a": "reproduzir antes de teorizar", "b": "fixture mínima primeiro"},
    }
    receipt.update(overrides)
    return receipt


def make_state(tmp_path: Path) -> dict:
    """Minimal canonical-shaped state (mirrors test_gate.make_state intent)."""
    return {
        "version": 2,
        "system": "agora-continuum",
        "learner": {
            "id": "learner-test",
            "level": "intermediate",
            "languages": ["TypeScript"],
            "active_language": "TypeScript",
            "aidi": {
                "current": 0.3,
                "threshold_amber": 0.6,
                "threshold_red": 0.75,
                "measurement_source": "self_reported",
                "history": [],
            },
        },
        "agent_ownership": {
            role: f"agent-{role}"
            for role in (
                "leader",
                "diagnostic",
                "path",
                "producer",
                "tutor",
                "verifier",
                "reviewer",
                "metrics",
                "memory",
                "governance",
            )
        },
        "state_machine": {"current": "practicing"},
        "active_unit": {
            "id": "U2-key-value-store",
            "title": "KV WAREHOUSE",
            "project": "02_key_value_store",
            "state": "practicing",
            "retry_count": 0,
            "retry_limit": 3,
            "unblock_condition": "learner_attempt_evaluated",
        },
        "gate": {"implementation_blocked": False},
        "empirical_gates": {
            "learning": {"requires_attempt_before_solution": True}
        },
        "next_action": {"owner": "learner", "action": "keep practicing"},
        "units_log": [
            {
                "unit_id": "U2-key-value-store",
                "concept": "KV WAREHOUSE",
                "kind": "concept",
                "project": "02_key_value_store",
                "mastered": False,
                "reviews": [{"date": "2026-10-01", "event": "presented"}],
            }
        ],
        "streak": {
            "current": 0,
            "longest": 0,
            "last_gate_date": None,
            "freezes": {"equipped": 0, "max": 2},
        },
    }


class TestVerifyPracticeConclusion(unittest.TestCase):
    def setUp(self) -> None:
        self.practice = load_practice()

    def test_verified_first_attempt_maps_to_good(self) -> None:
        verified = verify_practice_conclusion(make_receipt(self.practice), self.practice)
        self.assertEqual(verified["outcome"], "pass_first_try")
        self.assertEqual(verified["rating"], "good")

    def test_verified_retry_maps_to_hard(self) -> None:
        receipt = make_receipt(self.practice, attempt=2)
        verified = verify_practice_conclusion(receipt, self.practice)
        self.assertEqual(verified["outcome"], "pass_retried")
        self.assertEqual(verified["rating"], "hard")

    def test_deterministic_verdict(self) -> None:
        receipt = make_receipt(self.practice)
        first = verify_practice_conclusion(receipt, self.practice)
        second = verify_practice_conclusion(json.loads(json.dumps(receipt)), self.practice)
        self.assertEqual(first, second)

    def test_rejects_wrong_content_version(self) -> None:
        receipt = make_receipt(self.practice, content_version="pg-d01@deadbeef0000")
        with self.assertRaises(PracticeReceiptError):
            verify_practice_conclusion(receipt, self.practice)

    def test_rejects_unconcluded_phase(self) -> None:
        receipt = make_receipt(self.practice, phase="feedback")
        with self.assertRaises(PracticeReceiptError):
            verify_practice_conclusion(receipt, self.practice)

    def test_rejects_missing_criterion(self) -> None:
        receipt = make_receipt(self.practice)
        receipt["assessments"].pop(next(iter(receipt["assessments"])))
        with self.assertRaises(PracticeReceiptError):
            verify_practice_conclusion(receipt, self.practice)

    def test_rejects_not_met_without_justification(self) -> None:
        receipt = make_receipt(self.practice)
        criterion = next(iter(receipt["assessments"]))
        receipt["assessments"][criterion] = {"verdict": "not_met", "evidence": "x"}
        with self.assertRaises(PracticeReceiptError):
            verify_practice_conclusion(receipt, self.practice)

    def test_partial_requires_written_justification(self) -> None:
        receipt = make_receipt(self.practice)
        criterion = next(iter(receipt["assessments"]))
        receipt["assessments"][criterion] = {
            "verdict": "partial",
            "evidence": "x",
            "partial_justification": "  ",
        }
        with self.assertRaises(PracticeReceiptError):
            verify_practice_conclusion(receipt, self.practice)

    def test_daily_family_enforces_attempt_cap(self) -> None:
        receipt = make_receipt(self.practice, family="daily", attempt=3)
        with self.assertRaises(PracticeReceiptError):
            verify_practice_conclusion(receipt, self.practice)

    def test_rejects_empty_takeaway(self) -> None:
        receipt = make_receipt(self.practice)
        receipt["takeaway"]["b"] = " "
        with self.assertRaises(PracticeReceiptError):
            verify_practice_conclusion(receipt, self.practice)

    def test_rejects_unknown_family(self) -> None:
        receipt = make_receipt(self.practice, family="arcade")
        with self.assertRaises(PracticeReceiptError):
            verify_practice_conclusion(receipt, self.practice)


class TestTransitionAndCommit(unittest.TestCase):
    def setUp(self) -> None:
        self.practice = load_practice()
        self.tmp = Path(__file__).parent / "_practice_tmp_aid5005"
        self.state_path = self.tmp / "learner" / "learning_state.yaml"
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        self.state = make_state(self.tmp)
        with open(self.state_path, "w", encoding="utf-8") as handle:
            import yaml

            yaml.safe_dump(self.state, handle)

    def tearDown(self) -> None:
        import shutil

        shutil.rmtree(self.tmp, ignore_errors=True)

    def _commit(self, receipt: dict | None = None) -> dict:
        return commit_practice_conclusion(
            self.state,
            receipt=receipt or make_receipt(self.practice),
            practice=self.practice,
            today=date(2026, 10, 17),
            root=self.tmp,
            path=self.state_path,
        )

    def test_commit_appends_one_gate_review_and_never_masters(self) -> None:
        new_state = self._commit()
        unit_id = practice_unit_id("pg-d01")
        entry = next(u for u in new_state["units_log"] if u["unit_id"] == unit_id)
        gate_reviews = [r for r in entry["reviews"] if r.get("event") == "gate"]
        self.assertEqual(len(gate_reviews), 1)
        self.assertEqual(gate_reviews[0]["gate_kind"], PRACTICE_GATE_KIND)
        self.assertEqual(gate_reviews[0]["rating"], "good")
        self.assertFalse(entry["mastered"])
        self.assertTrue(validate(new_state, self.tmp) == [])

    def test_commit_extends_streak_and_advances_card(self) -> None:
        from learner.substrate.scheduling import build_card_from_reviews, card_state_view

        new_state = self._commit()
        self.assertEqual(new_state["streak"]["current"], 1)
        entry = next(
            u
            for u in new_state["units_log"]
            if u["unit_id"] == practice_unit_id("pg-d01")
        )
        card = build_card_from_reviews(entry["reviews"])
        assert card is not None and card.due is not None
        state_view = card_state_view(card)
        assert state_view is not None
        # FSRS learning steps are (1d, 4d): a first "good" review schedules the
        # second learning step -> due = today + 4 days. Deterministic (no fuzz).
        self.assertEqual(state_view["due"], "2026-10-21")
        self.assertGreater(float(state_view["stability"]), 0.0)

    def test_second_conclusion_advances_card_exactly_once(self) -> None:
        first = self._commit()
        second = commit_practice_conclusion(
            first,
            receipt=make_receipt(self.practice, attempt=2, concluded_at="2026-10-18T10:00:00+00:00"),
            practice=self.practice,
            today=date(2026, 10, 18),
            root=self.tmp,
            path=self.state_path,
        )
        entry = next(
            u
            for u in second["units_log"]
            if u["unit_id"] == practice_unit_id("pg-d01")
        )
        gate_reviews = [r for r in entry["reviews"] if r.get("event") == "gate"]
        self.assertEqual(len(gate_reviews), 2)
        self.assertEqual(gate_reviews[-1]["rating"], "hard")
        self.assertFalse(entry["mastered"])

    def test_receipt_is_digest_bound_and_tampering_is_detected(self) -> None:
        new_state = self._commit()
        entry = next(
            u
            for u in new_state["units_log"]
            if u["unit_id"] == practice_unit_id("pg-d01")
        )
        receipt_path = self.tmp / entry["evidence_file"]
        self.assertTrue(receipt_path.is_file())
        raw = json.loads(receipt_path.read_text(encoding="utf-8"))
        raw["assessments"] = {}  # tamper: strip the rubric verdicts
        receipt_path.write_text(json.dumps(raw), encoding="utf-8")
        violations = validate(new_state, self.tmp)
        self.assertTrue(
            any("does not match the digest" in v for v in violations), violations
        )

    def test_rejects_conclusion_on_mastered_unit(self) -> None:
        new_state = self._commit()
        entry = next(
            u
            for u in new_state["units_log"]
            if u["unit_id"] == practice_unit_id("pg-d01")
        )
        entry["mastered"] = True
        with self.assertRaises(PracticeReceiptError):
            transition_practice_conclusion(
                new_state,
                receipt=make_receipt(self.practice, attempt=2),
                practice=self.practice,
                today=date(2026, 10, 18),
                root=self.tmp,
            )

    def test_validate_flags_mastered_practice_unit(self) -> None:
        new_state = self._commit()
        entry = next(
            u
            for u in new_state["units_log"]
            if u["unit_id"] == practice_unit_id("pg-d01")
        )
        entry["mastered"] = True
        violations = validate(new_state, self.tmp)
        self.assertTrue(
            any("never masters" in v for v in violations), violations
        )


class TestBoundPracticeReceiptViolations(unittest.TestCase):
    def setUp(self) -> None:
        self.practice = load_practice()
        self.tmp = Path(__file__).parent / "_practice_bound_tmp_aid5005"
        self.tmp.mkdir(parents=True, exist_ok=True)

    def tearDown(self) -> None:
        import shutil

        shutil.rmtree(self.tmp, ignore_errors=True)

    def _persist(self) -> tuple[Path, str]:
        receipt = make_receipt(self.practice)
        path = self.tmp / "receipt.json"
        payload = json.dumps(receipt, sort_keys=True, indent=1).encode() + b"\n"
        path.write_bytes(payload)
        return path, hashlib.sha256(payload).hexdigest()

    def test_matching_digest_passes(self) -> None:
        path, digest = self._persist()
        self.assertEqual(
            bound_practice_receipt_violations(path, digest, self.tmp), []
        )

    def test_wrong_digest_fails(self) -> None:
        path, _ = self._persist()
        wrong = "0" * 64
        violations = bound_practice_receipt_violations(path, wrong, self.tmp)
        self.assertTrue(any("digest" in v for v in violations))

    def test_missing_file_fails(self) -> None:
        violations = bound_practice_receipt_violations(
            self.tmp / "nope.json", "0" * 64, self.tmp
        )
        self.assertTrue(any("missing" in v for v in violations))

    def test_embedded_verifier_block_fails(self) -> None:
        receipt = make_receipt(self.practice)
        receipt["verifier"] = {"verdict": "PASS"}
        path = self.tmp / "receipt.json"
        payload = json.dumps(receipt, sort_keys=True, indent=1).encode() + b"\n"
        path.write_bytes(payload)
        digest = hashlib.sha256(payload).hexdigest()
        violations = bound_practice_receipt_violations(path, digest, self.tmp)
        self.assertTrue(any("verifier" in v for v in violations))

    def test_persist_is_deterministic_in_shape(self) -> None:
        receipt = make_receipt(self.practice)
        when = datetime(2026, 10, 17, 12, tzinfo=timezone.utc)
        relative, digest_a = persist_practice_receipt(self.tmp, dict(receipt), when)
        self.assertTrue(relative.startswith("learner/practice_receipts/pg-d01-20261017-01"))
        raw = (self.tmp / relative).read_bytes()
        self.assertEqual(
            hashlib.sha256(raw).hexdigest(),
            digest_a,
        )


if __name__ == "__main__":
    unittest.main()
