"""voxelDojo consumes the same READ-ONLY scheduling slice as pixelDojo,
rendered into its own module. The game emits evidence only and never marks
mastery (GameNeverMarksMastery); these tests pin the projection contract."""

from __future__ import annotations

import unittest
import copy
import tempfile
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

import learner.substrate
import learner.substrate.dashboard_snapshot

ROOT = Path(__file__).resolve().parent.parent.parent.parent


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
            self.assertFalse(list(voxel_root.glob("game-*/src/content/reviewSlice.ts")))


if __name__ == "__main__":
    unittest.main()
