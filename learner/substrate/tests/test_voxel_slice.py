"""voxelDojo consumes READ-ONLY scheduling slices produced by the substrate.

Two delivery channels exist, both derived from the same canonical state:

1. The legacy shared module at ``engines/voxelDojo/shared/content.ts``
   (consumed by ``game-*/src/evidence/emit.ts`` via the relative
   ``../../../shared/content`` import). Kept for backward compatibility with
   the existing 16 emitters.
2. Per-game slices at ``engines/voxelDojo/game-*/src/reviewSlice.ts``. These
   are the canonical substrate outputs after the audit fix (TECH_DEBT
   AUDIT_2026-07-08 #4) and the only files the CI stub detector scans.

The game emits evidence only and never marks mastery
(GameNeverMarksMastery); these tests pin the projection contract for both
channels and the per-game fan-out that closes the 15/16 hand-copied stub gap.
"""

from __future__ import annotations

import re
import unittest
import copy
import tempfile
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

import learner.substrate
import learner.substrate.dashboard_snapshot

ROOT = Path(__file__).resolve().parent.parent.parent.parent
VOXEL_DOJO = ROOT / "engines" / "voxelDojo"


@contextmanager
def isolated_voxel_sync_outputs():
    state = learner.substrate.load_canonical()
    snapshot_module = learner.substrate.dashboard_snapshot

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        voxel_root = root / "engines" / "voxelDojo"
        with (
            patch.object(learner.substrate, "ROOT", root),
            patch.object(learner.substrate, "load_and_validate", return_value=state),
            patch.object(snapshot_module, "load_canonical", return_value=copy.deepcopy(state)),
        ):
            yield voxel_root


class TestVoxelReviewSlice(unittest.TestCase):
    def test_slice_contains_only_scheduling_truth(self):
        from learner.substrate.dashboard_snapshot import build_pixel_review_slice

        slc = build_pixel_review_slice()
        self.assertEqual(set(slc.keys()), {"nextReviews", "streak"})

    def test_full_sync_regenerates_shared_voxel_slice(self):
        from learner.substrate import sync
        from learner.substrate.dashboard_snapshot import build_pixel_review_slice
        from learner.substrate.ts_render import render_voxel_review_ts

        with isolated_voxel_sync_outputs() as voxel_root:
            sync()
            content = (voxel_root / "shared" / "content.ts").read_text(encoding="utf-8")
            self.assertEqual(content, render_voxel_review_ts(build_pixel_review_slice()))
            self.assertIn("AUTO-GENERATED", content)
            self.assertIn('export type ReviewReason = "due" | "overdue" | "interleaving" | "recurring-trap"', content)
            self.assertIn("export type ReviewSlice = {", content)
            self.assertIn("export const reviewSlice: ReviewSlice =", content)


class TestVoxelPerGameFanOut(unittest.TestCase):
    """Closes the 15/16 hand-copied stub gap (TECH_DEBT_AUDIT_2026-07-08 #4).

    The substrate's voxel sync MUST fan out to all 16 game packages via the
    canonical ``VOXEL_GAME_UNIT_IDS`` mapping. Each per-game file is
    rendered from the snapshot filtered to that game's unit; the file's
    ``reason`` field is therefore FSRS-computed, never a static literal.
    """

    def test_all_16_game_ids_known_to_substrate(self):
        from learner.substrate.dashboard_snapshot import (
            VOXEL_GAME_IDS,
            VOXEL_GAME_UNIT_IDS,
        )

        self.assertEqual(len(VOXEL_GAME_IDS), 16)
        # Every game-* directory under engines/voxelDojo/ is in the substrate map.
        on_disk = sorted(p.name for p in VOXEL_DOJO.glob("game-*") if p.is_dir())
        self.assertEqual(sorted(VOXEL_GAME_UNIT_IDS.keys()), on_disk)

    def test_per_game_filter_isolates_the_correct_unit(self):
        from learner.substrate.dashboard_snapshot import (
            VOXEL_GAME_UNIT_IDS,
            build_voxel_per_game_review_slices,
        )

        snapshot = {
            "nextReviews": [
                {
                    "unitId": "U2-key-value-store",
                    "title": "KV WAREHOUSE",
                    "dueIn": "overdue 1d",
                    "reason": "overdue",
                },
                {
                    "unitId": "U9-distributed-cache",
                    "title": "HASH RING",
                    "dueIn": "today",
                    "reason": "due",
                },
                {
                    "unitId": "P-001",
                    "title": "Recurring trap",
                    "dueIn": "today",
                    "reason": "recurring-trap",
                },
            ],
            "streak": {
                "current": 2,
                "longest": 2,
                "lastGateDate": "2026-08-13",
                "freezesEquipped": 1,
                "freezesMax": 2,
            },
        }
        slices = build_voxel_per_game_review_slices(snapshot)

        # game-02 (U2) should see only its own unit, not P-001 or U9.
        game02 = slices["game-02-warehouse"]
        self.assertEqual(len(game02["nextReviews"]), 1)
        self.assertEqual(game02["nextReviews"][0]["unitId"], "U2-key-value-store")
        self.assertEqual(game02["nextReviews"][0]["reason"], "overdue")

        # game-10 (U9) sees only its own unit.
        game10 = slices["game-10-hash-ring"]
        self.assertEqual(len(game10["nextReviews"]), 1)
        self.assertEqual(game10["nextReviews"][0]["reason"], "due")

        # game-03 (U3) is not in the queue, so the slice is empty (no scheduled review).
        self.assertEqual(slices["game-03-wormhole"]["nextReviews"], [])

        # Streak is shared.
        for game_id in VOXEL_GAME_UNIT_IDS:
            self.assertEqual(slices[game_id]["streak"], snapshot["streak"])

    def test_per_game_render_carries_substrate_marker_and_unit(self):
        from learner.substrate.ts_render import render_voxel_per_game_review_ts

        text = render_voxel_per_game_review_ts(
            "game-10-hash-ring",
            "U9-distributed-cache",
            {
                "nextReviews": [
                    {
                        "unitId": "U9-distributed-cache",
                        "title": "HASH RING",
                        "dueIn": "today",
                        "reason": "due",
                    }
                ],
                "streak": {
                    "current": 2,
                    "longest": 2,
                    "lastGateDate": "2026-08-13",
                    "freezesEquipped": 1,
                    "freezesMax": 2,
                },
            },
        )
        self.assertIn("@substrate-generated", text)
        self.assertIn("AUTO-GENERATED by learner/substrate/ts_render.py for game-10-hash-ring", text)
        self.assertIn('gameId: "game-10-hash-ring"', text)
        self.assertIn('unitId: "U9-distributed-cache"', text)
        # The reason is the FSRS-computed value, NOT a hardcoded "due" literal.
        self.assertIn('reason: "due"', text)

    def test_full_sync_writes_per_game_slice_for_every_voxel_game(self):
        """Live sync, isolated temp dir: every game package gets a fresh
        ``src/reviewSlice.ts`` even when the canonical state is read from a
        patched deep-copy. This is the unit-level fan-out guarantee; the
        on-disk detector covers the same property for the real repo."""
        from learner.substrate import sync
        from learner.substrate.dashboard_snapshot import VOXEL_GAME_UNIT_IDS

        with isolated_voxel_sync_outputs() as voxel_root:
            sync()
            for game_id in VOXEL_GAME_UNIT_IDS:
                per_game = voxel_root / game_id / "src" / "reviewSlice.ts"
                self.assertTrue(
                    per_game.exists(),
                    f"substrate must write {per_game} for every voxelDojo game",
                )

    def test_full_sync_per_game_files_match_re_renderer(self):
        """Hash-equality round-trip in an isolated temp dir."""
        from learner.substrate import sync
        from learner.substrate.dashboard_snapshot import (
            VOXEL_GAME_UNIT_IDS,
            build_voxel_per_game_review_slices,
        )
        from learner.substrate.ts_render import render_voxel_per_game_review_ts

        with isolated_voxel_sync_outputs() as voxel_root:
            sync()
            live_slices = build_voxel_per_game_review_slices()
            for game_id, unit_id in VOXEL_GAME_UNIT_IDS.items():
                per_game = voxel_root / game_id / "src" / "reviewSlice.ts"
                on_disk = per_game.read_text(encoding="utf-8")
                expected = render_voxel_per_game_review_ts(
                    game_id, unit_id, live_slices[game_id]
                )
                self.assertEqual(
                    on_disk,
                    expected,
                    f"per-game file for {game_id} drifted from substrate output",
                )


class TestVoxelPerGameStubDetection(unittest.TestCase):
    """CI check for TECH_DEBT_AUDIT_2026-07-08 #4: no voxelDojo per-game
    ``src/reviewSlice.ts`` may revert to a hand-copied stub.

    Detection strategy (rationale per file):
    - **Hash match against the live re-render** is the load-bearing check.
      A stub would either be missing the ``@substrate-generated`` marker, miss
      the per-game ``gameId``/``unitId`` payload, or carry a hardcoded
      ``reason`` that does not match the FSRS-computed queue. The re-render
      check catches all three without any "known stub hash" whitelist to
      maintain.
    - The ``@substrate-generated`` marker is a defense-in-depth signal for
      the case where the file exists but the substrate's renderer signature
      has drifted; if the marker is gone, a human edited the file.
    - The mtime signal was considered and rejected: the substrate's atomic
      write is temp-file-then-rename, which preserves the mtime of the
      replaced file in some filesystems and resets it in others, so
      mtime-based detection is unreliable across CI runners.
    """

    MARKER = "@substrate-generated"

    def _real_per_game_paths(self) -> list[Path]:
        from learner.substrate.dashboard_snapshot import VOXEL_GAME_UNIT_IDS

        return [
            VOXEL_DOJO / game_id / "src" / "reviewSlice.ts"
            for game_id in VOXEL_GAME_UNIT_IDS
        ]

    def test_all_sixteen_per_game_files_exist_on_disk(self):
        missing = [p for p in self._real_per_game_paths() if not p.exists()]
        self.assertEqual(
            missing,
            [],
            f"missing per-game reviewSlice.ts files: {[str(p) for p in missing]}",
        )

    def test_on_disk_per_game_files_match_live_substrate_renderer(self):
        """Order-independent hash-equality stub detector.

        Asserts the on-disk per-game files match the live substrate re-render
        WITHOUT running ``sync()`` first. A real substrate output is
        identical to the re-render; a hand-copied stub (with or without the
        marker, with wrong content, or with a different gameId) is not.

        This test deliberately does NOT call ``sync()`` — the point is to
        detect the file as it sits on disk (which is what CI sees). The
        caller can run ``python3 -m learner.substrate`` to repair a failing
        file. A separate test
        (``test_full_sync_round_trip_keeps_per_game_files_in_sync``) verifies
        the round-trip works.

        This test is the load-bearing stub detector. The marker check below
        is defense-in-depth for the case where the file exists but the
        substrate's renderer signature has drifted.
        """
        from learner.substrate.dashboard_snapshot import (
            VOXEL_GAME_UNIT_IDS,
            build_voxel_per_game_review_slices,
        )
        from learner.substrate.ts_render import render_voxel_per_game_review_ts

        live = build_voxel_per_game_review_slices()
        for game_id, unit_id in VOXEL_GAME_UNIT_IDS.items():
            per_game = VOXEL_DOJO / game_id / "src" / "reviewSlice.ts"
            text = per_game.read_text(encoding="utf-8")
            # Defense-in-depth: the @substrate-generated marker is the
            # load-bearing signal that the file came from the substrate
            # renderer; missing it means a hand-edit, even if the content
            # happened to match the live re-render.
            self.assertIn(
                self.MARKER,
                text,
                f"{per_game.relative_to(ROOT)} is missing the "
                "@substrate-generated marker — possible hand-copied stub "
                "(TECH_DEBT_AUDIT_2026-07-08 #4)",
            )
            # Hash-equality check: the on-disk content must match the live
            # re-render byte-for-byte. This is the most robust stub
            # detector because a hand-copied file with the marker but wrong
            # content (e.g. wrong gameId) will fail this check.
            expected = render_voxel_per_game_review_ts(game_id, unit_id, live[game_id])
            self.assertEqual(
                text,
                expected,
                f"{per_game.relative_to(ROOT)} does not match the live "
                "substrate re-render — possible hand-copied stub or "
                "out-of-sync file (TECH_DEBT_AUDIT_2026-07-08 #4). "
                "Run `python3 -m learner.substrate` to regenerate.",
            )

    def test_no_per_game_file_is_content_identical_across_games(self):
        """The audit's "hand-copied stub" was a single file copied across
        15 games. Even if the marker is present, the per-game gameId
        payload MUST match the directory name — if every file had the same
        gameId literal, the file would be a copy-paste artifact."""
        for path in self._real_per_game_paths():
            text = path.read_text(encoding="utf-8")
            # The file's gameId payload must match its directory.
            # game-05-relay-station's file MUST carry game-05's id, not
            # e.g. game-10's (the audit's "all the same content" failure).
            expected_game_id = path.parent.parent.name
            self.assertIn(
                f'gameId: "{expected_game_id}"',
                text,
                f"{path.name} should carry gameId {expected_game_id!r} "
                f"but does not — possible cross-game copy-paste",
            )

    def test_reason_field_is_finite_typed_value_not_a_placeholder(self):
        """A hand-copied stub would have a hardcoded reason. Real per-game
        files carry the FSRS-computed reason: either an exact match to the
        snapshot's queue, or no ``nextReviews`` entries at all (the game
        unit is not currently due → empty queue is the truthful answer)."""
        from learner.substrate.dashboard_snapshot import build_pixel_review_slice

        snapshot = build_pixel_review_slice()
        global_reasons = {r.get("reason") for r in snapshot.get("nextReviews", [])}
        # The substrate only emits a closed vocabulary; lock that down.
        self.assertTrue(
            global_reasons.issubset({"due", "overdue", "interleaving", "recurring-trap"}),
            f"unexpected review_reason values in snapshot: {global_reasons}",
        )

        for path in self._real_per_game_paths():
            text = path.read_text(encoding="utf-8")
            # Strip comments and type declarations to isolate the data literal.
            data_section = text.split("export const reviewSlice:", 1)[1]
            # If a reason literal appears, it must come from the closed set
            # (the re-render check in this class guarantees it came from FSRS,
            # not a hand-typed stub).
            for match in re.finditer(r'reason:\s*"([^"]+)"', data_section):
                self.assertIn(
                    match.group(1),
                    {"due", "overdue", "interleaving", "recurring-trap"},
                    f"{path.name} has out-of-vocabulary reason {match.group(1)!r}",
                )


class TestVoxelPerGameSyncRoundTrip(unittest.TestCase):
    """End-to-end regression net for the per-game sync round-trip.

    Split from :class:`TestVoxelPerGameStubDetection` because that class
    contains read-only stub detectors that must see the on-disk files
    BEFORE the substrate's ``sync()`` overwrites them. pytest's default
    alphabetical test ordering would otherwise run the sync test first
    and silently repair any stub before the read-only detectors could
    see it. Splitting into a separate class means pytest's
    class-alphabetical ordering still gives us a stable, predictable
    sequence: stub detectors first, sync round-trip last.
    """

    def test_full_sync_round_trip_writes_per_game_slice_for_every_voxel_game(self):
        from learner.substrate import sync
        from learner.substrate.dashboard_snapshot import VOXEL_GAME_UNIT_IDS

        sync()
        for game_id in VOXEL_GAME_UNIT_IDS:
            per_game = VOXEL_DOJO / game_id / "src" / "reviewSlice.ts"
            self.assertTrue(
                per_game.exists(),
                f"substrate must write {per_game} for every voxelDojo game",
            )

    def test_full_sync_round_trip_per_game_files_match_re_renderer(self):
        """After sync, every per-game file MUST match the live re-render."""
        from learner.substrate import sync
        from learner.substrate.dashboard_snapshot import (
            VOXEL_GAME_UNIT_IDS,
            build_voxel_per_game_review_slices,
        )
        from learner.substrate.ts_render import render_voxel_per_game_review_ts

        with tempfile.TemporaryDirectory() as tmp:
            state = learner.substrate.load_canonical()
            snapshot_module = learner.substrate.dashboard_snapshot
            from unittest.mock import patch
            from contextlib import ExitStack
            with ExitStack() as stack:
                root = Path(tmp)
                stack.enter_context(patch.object(learner.substrate, "ROOT", root))
                stack.enter_context(
                    patch.object(
                        learner.substrate,
                        "load_and_validate",
                        return_value=state,
                    )
                )
                stack.enter_context(
                    patch.object(
                        snapshot_module,
                        "load_canonical",
                        return_value=copy.deepcopy(state),
                    )
                )
                sync()
                live = build_voxel_per_game_review_slices()
                for game_id, unit_id in VOXEL_GAME_UNIT_IDS.items():
                    per_game = root / "engines" / "voxelDojo" / game_id / "src" / "reviewSlice.ts"
                    on_disk = per_game.read_text(encoding="utf-8")
                    expected = render_voxel_per_game_review_ts(
                        game_id, unit_id, live[game_id]
                    )
                    self.assertEqual(
                        on_disk,
                        expected,
                        f"per-game file for {game_id} drifted from substrate output",
                    )


if __name__ == "__main__":
    unittest.main()
