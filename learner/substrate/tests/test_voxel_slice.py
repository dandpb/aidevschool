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
        for index in range(1, 17):
            path = voxel_root / f"game-{index:02d}-test" / "src" / "content" / "reviewSlice.ts"
            path.parent.mkdir(parents=True)
            path.touch()
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

    def test_full_sync_regenerates_all_voxel_slices(self):
        from learner.substrate import sync

        with isolated_voxel_sync_outputs() as voxel_root:
            sync()
            paths = sorted(voxel_root.glob("game-*/src/content/reviewSlice.ts"))
            self.assertGreaterEqual(len(paths), 16, "fan-out must cover the full voxel fleet")
            for path in paths:
                content = path.read_text(encoding="utf-8")
                self.assertIn("AUTO-GENERATED", content)
                self.assertIn('import type { ReviewSlice } from "./types"', content)
                self.assertIn("export const reviewSlice: ReviewSlice =", content)


if __name__ == "__main__":
    unittest.main()
