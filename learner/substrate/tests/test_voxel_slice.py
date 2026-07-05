"""voxelDojo consumes the same READ-ONLY scheduling slice as pixelDojo,
rendered into its own module. The game emits evidence only and never marks
mastery (GameNeverMarksMastery); these tests pin the projection contract."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent.parent


class TestVoxelReviewSlice(unittest.TestCase):
    def test_slice_contains_only_scheduling_truth(self):
        from learner.substrate.dashboard_snapshot import build_pixel_review_slice

        slc = build_pixel_review_slice()
        self.assertEqual(set(slc.keys()), {"nextReviews", "streak"})

    def test_sync_writes_voxel_slice_module(self):
        from learner.substrate.dashboard_snapshot import VOXEL_REVIEW_TS, sync_voxel_review_slice

        path = sync_voxel_review_slice()
        self.assertEqual(path, VOXEL_REVIEW_TS)
        content = path.read_text(encoding="utf-8")
        self.assertIn("AUTO-GENERATED", content)
        self.assertIn('import type { ReviewSlice } from "./types"', content)
        self.assertIn("export const reviewSlice: ReviewSlice =", content)

    def test_full_sync_regenerates_voxel_slice(self):
        from learner.substrate import sync

        sync()
        path = ROOT / "engines" / "voxelDojo" / "game-10-hash-ring" / "src" / "content" / "reviewSlice.ts"
        self.assertTrue(path.exists(), "full sync() must regenerate the voxelDojo review slice")


if __name__ == "__main__":
    unittest.main()
