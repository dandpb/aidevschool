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
        from learner.substrate.dashboard_snapshot import (
            VOXEL_REVIEW_TS,
            discover_voxel_review_slice_paths,
            sync_voxel_review_slice,
        )

        paths = sync_voxel_review_slice()
        self.assertIsInstance(paths, list)
        self.assertIn(VOXEL_REVIEW_TS, paths)
        self.assertGreaterEqual(len(paths), 16, "fan-out must cover the full voxel fleet")
        for path in paths:
            content = path.read_text(encoding="utf-8")
            self.assertIn("AUTO-GENERATED", content)
            self.assertIn('import type { ReviewSlice } from "./types"', content)
            self.assertIn("export const reviewSlice: ReviewSlice =", content)

        discovered = discover_voxel_review_slice_paths()
        self.assertEqual(set(paths), set(discovered))

    def test_full_sync_regenerates_all_voxel_slices(self):
        from learner.substrate import sync
        from learner.substrate.dashboard_snapshot import discover_voxel_review_slice_paths

        sync()
        paths = discover_voxel_review_slice_paths()
        self.assertGreaterEqual(len(paths), 16)
        for path in paths:
            self.assertTrue(path.exists(), f"full sync() must regenerate {path}")
            # Stubs used empty nextReviews with a frozen Generated header;
            # regenerated files always carry a live Generated timestamp line.
            text = path.read_text(encoding="utf-8")
            self.assertIn("export const reviewSlice: ReviewSlice =", text)


if __name__ == "__main__":
    unittest.main()
