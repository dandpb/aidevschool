from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import learner.substrate as substrate
from learner.substrate import dashboard_snapshot
from learner.substrate import ts_render


SNAPSHOT = {
    "activeUnit": {
        "id": "U-BRIDGE",
        "title": "Canonical bridge unit",
        "project": "02_key_value_store",
        "state": "evaluating",
        "retryCount": 1,
        "retryLimit": 3,
    },
    "gate": {
        "implementationBlocked": True,
        "unblockCondition": "learner_attempt_evaluated",
    },
    "profile": {
        "dreyfus": "proficient",
        "bloom": "analyze",
        "activeLanguage": "TypeScript",
        "weeklyTimeHours": 5,
    },
    "aidi": {
        "current": 0.34,
        "thresholdAmber": 0.6,
        "thresholdRed": 0.75,
        "trend": [{"date": "2026-07-08", "value": 0.34}],
    },
    "topPitfalls": [],
    "nextReviews": [],
    "masteredCount": 2,
    "scaffoldedCount": 16,
    "streak": {
        "current": 3,
        "longest": 7,
        "lastGateDate": "2026-07-08",
        "freezesEquipped": 1,
        "freezesMax": 2,
    },
    "curr": 0,
    "predictions": {
        "count": 0,
        "byMetric": {
            "latency": {"correct": 0, "total": 0},
            "memory": {"correct": 0, "total": 0},
            "throughput": {"correct": 0, "total": 0},
        },
    },
}


class TestCodexDojoOsSnapshot(unittest.TestCase):
    def test_sync_writes_generated_read_only_module(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "learner.ts"

            with patch.object(dashboard_snapshot, "CODEXDOJO_OS_SNAPSHOT_TS", output, create=True):
                path = dashboard_snapshot.sync_codexdojo_os_snapshot(SNAPSHOT)

            self.assertEqual(path, output)
            text = output.read_text(encoding="utf-8")
            self.assertIn('id: "U-BRIDGE"', text)
            self.assertIn('state: "evaluating"', text)
            self.assertIn("current: 3", text)

    def test_render_preserves_empty_collections_and_zero_counts(self) -> None:
        empty_snapshot = {
            **SNAPSHOT,
            "topPitfalls": [],
            "nextReviews": [],
            "masteredCount": 0,
            "scaffoldedCount": 0,
        }

        text = ts_render.render_codexdojo_os_ts(empty_snapshot)

        self.assertIn("topPitfalls: []", text)
        self.assertIn("nextReviews: []", text)
        self.assertIn("masteredCount: 0", text)
        self.assertIn("scaffoldedCount: 0", text)

    def test_generated_module_declares_canonical_source_and_no_write_api(self) -> None:
        text = ts_render.render_codexdojo_os_ts(SNAPSHOT)

        self.assertIn("AUTO-GENERATED", text)
        self.assertIn("DO NOT EDIT", text)
        self.assertIn("learner/learning_state.yaml", text)
        self.assertEqual(text.count("export const learnerSnapshot"), 1)
        self.assertNotIn("markMastered", text)
        self.assertNotIn("setState", text)
        self.assertNotIn("save", text)

    def test_substrate_sync_fans_out_one_snapshot_to_dashboard_and_os(self) -> None:
        root = dashboard_snapshot.ROOT
        dashboard_path = root / "engines" / "codexDojo" / "src" / "data" / "learner.ts"
        os_path = root / "engines" / "codexdojo-os-prototype" / "src" / "data" / "learner.ts"
        pixel_path = root / "engines" / "pixelDojo" / "pixel-quest" / "src" / "content" / "reviewSlice.ts"

        with (
            patch.object(substrate, "atomic_write_text"),
            patch.object(substrate, "load_and_validate", return_value={}),
            patch.object(substrate, "derive_whiteboard_profile", return_value={}),
            patch.object(substrate, "derive_whiteboard_trail", return_value={}),
            patch.object(substrate, "render_mavis_yaml", return_value=""),
            patch.object(substrate, "render_profile_yaml", return_value=""),
            patch.object(substrate, "render_profile_md", return_value=""),
            patch.object(substrate, "render_trail_md", return_value=""),
            patch.object(dashboard_snapshot, "build_snapshot", return_value=SNAPSHOT),
            patch.object(dashboard_snapshot, "sync", return_value=dashboard_path) as dashboard_sync,
            patch.object(
                dashboard_snapshot,
                "sync_codexdojo_os_snapshot",
                return_value=os_path,
                create=True,
            ) as os_sync,
            patch.object(
                dashboard_snapshot,
                "sync_pixel_review_slice",
                return_value=pixel_path,
            ) as pixel_sync,
            patch.object(dashboard_snapshot, "sync_voxel_review_slice", return_value=[]) as voxel_sync,
        ):
            substrate.sync()

        dashboard_sync.assert_called_once_with(SNAPSHOT)
        os_sync.assert_called_once_with(SNAPSHOT)
        pixel_sync.assert_called_once_with(SNAPSHOT)
        voxel_sync.assert_called_once_with(SNAPSHOT)

    def test_os_and_dashboard_renderers_share_contract_values(self) -> None:
        dashboard_text = ts_render.render_dashboard_ts(SNAPSHOT)
        os_text = ts_render.render_codexdojo_os_ts(SNAPSHOT)

        for expected in (
            'id: "U-BRIDGE"',
            'state: "evaluating"',
            "implementationBlocked: true",
            "current: 3",
            "masteredCount: 2",
            "scaffoldedCount: 16",
        ):
            self.assertIn(expected, dashboard_text)
            self.assertIn(expected, os_text)


if __name__ == "__main__":
    unittest.main()
