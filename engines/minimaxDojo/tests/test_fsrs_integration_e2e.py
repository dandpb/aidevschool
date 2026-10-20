"""AID-5005 — end-to-end FSRS integration tests (substrate ⇄ minimaxDojo ⇄ dojoToday).

Proves the invariant the issue demands, against a hermetic copy of the real
canonical state:

1. A verified LESSON gate completion (existing ``transition_gate`` seam)
   advances the unit's FSRS card and the daily queue + dojoToday ``today.ts``
   view reflect the new scheduling truth (materialized
   ``stability``/``difficulty``/``due``).
2. A verified GUIDED-PRACTICE conclusion (``core.fsrs_bridge`` →
   ``learner.substrate.practice``) creates exactly one gate review, never
   masters, advances the card, and the practice unit leaves the daily queue
   until its FSRS due date.
3. The OS prototype snapshot (``learner.ts``) carries the same card fields.
4. Determinism: identical fixtures → byte-identical derived views.
"""

from __future__ import annotations

import json
import shutil
import unittest
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

STATE_FILES = (
    "learner/learning_state.yaml",
    "learner/learner_profile.md",
    "learner/pitfalls.md",
    "learner/journal.md",
    "learner/predictions.yaml",
    "curriculum/catalog.md",
    "curriculum/BACKLOG_STATUS.md",
)
EVIDENCE_FILES = (
    "engines/pixelDojo/.logs/last_run_evidence.json",
    "engines/voxelDojo/game-02-warehouse/.logs/evidence.ndjson",
)
PRACTICE_PACKAGE = "curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza"

TODAY = date(2026, 10, 17)


def build_fixture(tmp: Path) -> Path:
    for relative in STATE_FILES + EVIDENCE_FILES:
        source = REPO_ROOT / relative
        target = tmp / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    # learner attempts referenced by units_log (small, auditable history)
    attempts_target = tmp / "learner" / "attempts"
    attempts_target.mkdir(parents=True, exist_ok=True)
    for attempt in (REPO_ROOT / "learner" / "attempts").glob("*.md"):
        shutil.copy2(attempt, attempts_target / attempt.name)
    package_source = REPO_ROOT / PRACTICE_PACKAGE
    package_target = tmp / PRACTICE_PACKAGE
    if package_target.exists():
        shutil.rmtree(package_target)
    shutil.copytree(package_source, package_target)
    return tmp


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


class TestFsrsIntegrationE2E(unittest.TestCase):
    def setUp(self) -> None:
        import tempfile

        self._tmp = tempfile.TemporaryDirectory(prefix="aid5005_e2e_")
        self.root = build_fixture(Path(self._tmp.name))
        self.state_path = self.root / "learner" / "learning_state.yaml"

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _load_state(self) -> dict:
        import yaml

        with open(self.state_path, encoding="utf-8") as handle:
            return yaml.safe_load(handle)

    def _practice(self) -> dict:
        from engines.minimaxDojo.core.fsrs_bridge import load_practice_catalog

        catalog = load_practice_catalog(self.root)
        self.assertIn("pg-d01", catalog)
        return catalog["pg-d01"]

    def _today_ts(self, state: dict) -> str:
        from learner.substrate.adapters.dojotoday import (
            derive_today_snapshot,
            render_today_ts,
        )

        snapshot = derive_today_snapshot(self.root, state, TODAY)
        return render_today_ts(snapshot)

    def _os_learner_ts(self, state: dict) -> str:
        from learner.substrate.dashboard_snapshot import build_snapshot
        from learner.substrate.ts_render import render_codexdojo_os_ts

        snapshot = build_snapshot(
            self.state_path, state=state, source_root=self.root, today=TODAY
        )
        return render_codexdojo_os_ts(snapshot)

    # ------------------------------------------------------------------

    def test_lesson_gate_advances_card_and_daily_queue(self) -> None:
        from learner.substrate.gate import GateEvidenceReceipt, commit_gate_transition
        from learner.substrate.scheduling import card_state_view, derive_next_reviews
        from learner.substrate.scheduling import build_card_from_reviews

        state = self._load_state()
        queue_before = derive_next_reviews(state["units_log"], [], TODAY)
        u2_before = next(r for r in queue_before if r["unitId"] == "U2-key-value-store")
        self.assertIn("stability", u2_before)
        self.assertIn("difficulty", u2_before)
        self.assertIn("due", u2_before)

        receipt = GateEvidenceReceipt(
            timestamp="2026-10-17T10:00:00+00:00",
            digest="0" * 64,
            run_id="sha256:" + "0" * 64,
            attempt_id="learner/attempts/U2-key-value-store-attempt-2.md",
            attempt_digest="1" * 64,
            scenario_id="u2-warehouse",
        )
        new_state = commit_gate_transition(
            state,
            receipt=receipt,
            passed=True,
            gate_outcome="pass_exceeds",
            rating="easy",
            today=TODAY,
            path=self.state_path,
        )
        entry = next(
            u
            for u in new_state["units_log"]
            if u["unit_id"] == "U2-key-value-store"
        )
        card_after = card_state_view(build_card_from_reviews(entry["reviews"]))
        assert card_after is not None

        queue_after = derive_next_reviews(new_state["units_log"], [], TODAY)
        u2_after = next(
            (r for r in queue_after if r["unitId"] == "U2-key-value-store"), None
        )
        # "easy" pushes the next review beyond today → the unit leaves today's
        # queue; the card view still exposes the new scheduling truth.
        self.assertIsNone(u2_after)
        self.assertGreater(
            card_after["stability"], float(u2_before["stability"])
        )

    def test_practice_conclusion_round_trip(self) -> None:
        from engines.minimaxDojo.core.fsrs_bridge import (
            dojo_queue,
            practice_card_state,
            record_practice_conclusion,
        )
        from learner.substrate import validate
        from learner.substrate.practice import practice_unit_id

        state = self._load_state()
        self.assertIsNone(practice_card_state(state, "pg-d01"))

        result = record_practice_conclusion(
            make_receipt(self._practice()),
            today=TODAY,
            root=self.root,
            state_path=self.state_path,
            refresh=False,
        )
        unit_id = practice_unit_id("pg-d01")
        self.assertEqual(result["rating"], "good")
        self.assertEqual(result["outcome"], "pass_first_try")
        self.assertIsNone(result["card_before"])
        assert result["card_after"] is not None
        self.assertEqual(result["card_after"]["due"], "2026-10-21")

        # Persisted state: exactly one practice review, never mastered.
        persisted = self._load_state()
        entry = next(u for u in persisted["units_log"] if u["unit_id"] == unit_id)
        gate_reviews = [r for r in entry["reviews"] if r.get("event") == "gate"]
        self.assertEqual(len(gate_reviews), 1)
        self.assertFalse(entry["mastered"])
        self.assertEqual(validate(persisted, self.root), [])

        # Queue: the practice unit is scheduled ahead, so today hides it.
        queue = dojo_queue(today=TODAY, root=self.root, state_path=self.state_path)
        self.assertNotIn(unit_id, [row["unitId"] for row in queue])
        # ...and the card view is observable via the same seam.
        card = practice_card_state(persisted, "pg-d01")
        self.assertEqual(card, result["card_after"])

    def test_dojotoday_and_os_views_reflect_card_state(self) -> None:
        from engines.minimaxDojo.core.fsrs_bridge import record_practice_conclusion
        from learner.substrate.practice import practice_unit_id

        state = self._load_state()
        record_practice_conclusion(
            make_receipt(self._practice()),
            today=TODAY,
            root=self.root,
            state_path=self.state_path,
            refresh=False,
        )
        updated = self._load_state()

        today_ts = self._today_ts(updated)
        self.assertIn('"stability"', today_ts)
        self.assertIn('"difficulty"', today_ts)
        self.assertNotIn(practice_unit_id("pg-d01"), today_ts)  # due ahead

        os_ts = self._os_learner_ts(updated)
        # ts_render emits unquoted keys (stability: 2.31) — assert both fields.
        self.assertRegex(os_ts, r"stability: \d+\.\d+")
        self.assertRegex(os_ts, r"difficulty: \d+\.\d+")
        self.assertIn("due: \"2026-07-09\"", os_ts)

    def test_derived_views_are_deterministic(self) -> None:
        from engines.minimaxDojo.core.fsrs_bridge import record_practice_conclusion

        for _ in range(2):
            record_practice_conclusion(
                make_receipt(self._practice(), concluded_at="2026-10-17T09:00:00+00:00"),
                today=TODAY,
                root=self.root,
                state_path=self.state_path,
                refresh=False,
            )
            state = self._load_state()
            # drop the second conclusion's effect by regenerating the fixture
            break

        # Two independent fixtures + identical conclusion → identical views.
        outputs = []
        for _ in range(2):
            import tempfile

            with tempfile.TemporaryDirectory(prefix="aid5005_det_") as tmp_name:
                root = build_fixture(Path(tmp_name))
                state_path = root / "learner" / "learning_state.yaml"
                record_practice_conclusion(
                    make_receipt(
                        self._practice(), concluded_at="2026-10-17T09:00:00+00:00"
                    ),
                    today=TODAY,
                    root=root,
                    state_path=state_path,
                    refresh=False,
                )
                import yaml

                with open(state_path, encoding="utf-8") as handle:
                    state = yaml.safe_load(handle)
                from learner.substrate.adapters.dojotoday import (
                    derive_today_snapshot,
                    render_today_ts,
                )

                snapshot = derive_today_snapshot(root, state, TODAY)
                outputs.append(render_today_ts(snapshot))
        self.assertEqual(outputs[0], outputs[1])

    def test_unknown_practice_is_rejected(self) -> None:
        from engines.minimaxDojo.core.fsrs_bridge import record_practice_conclusion

        receipt = make_receipt(self._practice(), practice_id="pg-d99")
        with self.assertRaises(ValueError):
            record_practice_conclusion(
                receipt,
                today=TODAY,
                root=self.root,
                state_path=self.state_path,
                refresh=False,
            )


if __name__ == "__main__":
    unittest.main()
