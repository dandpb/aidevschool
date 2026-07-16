from __future__ import annotations

import unittest
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
    def test_os_snapshot_module_renders_canonical_values(self) -> None:
        text = ts_render.render_codexdojo_os_ts(SNAPSHOT)

        self.assertIn('id: "U-BRIDGE"', text)
        self.assertIn('state: "evaluating"', text)
        self.assertIn('current: 3', text)

    def test_render_preserves_empty_collections_and_zero_counts(self) -> None:
        empty_snapshot = {
            **SNAPSHOT,
            "topPitfalls": [],
            "nextReviews": [],
            "masteredCount": 0,
            "scaffoldedCount": 0,
        }

        text = ts_render.render_codexdojo_os_ts(empty_snapshot)

        self.assertIn('topPitfalls: []', text)
        self.assertIn('nextReviews: []', text)
        self.assertIn('masteredCount: 0', text)
        self.assertIn('scaffoldedCount: 0', text)

    def test_unsafe_snapshot_keys_are_json_quoted_and_cannot_inject_typescript(self) -> None:
        text = ts_render.render_dashboard_ts(
            {
                "punctuated-key": "safe",
                'key\"; globalThis.compromised = true; //': {"nested.key": True},
            }
        )

        self.assertIn('"punctuated-key": "safe"', text)
        self.assertIn(
            '"key\\\"; globalThis.compromised = true; //": {',
            text,
        )
        self.assertIn('"nested.key": true', text)
        self.assertNotIn('\n  key"; globalThis.compromised', text)

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
            patch.object(substrate, "load_and_validate", return_value={}),
            patch(
                "learner.substrate.projections.build_generated_views",
                return_value={dashboard_path: "dashboard", os_path: "os", pixel_path: "pixel"},
            ) as build_views,
            patch.object(substrate, "write_views") as write_views,
        ):
            substrate.sync()

        build_views.assert_called_once_with(substrate.SOURCE_ROOT, substrate.ROOT, {})
        write_views.assert_called_once_with(
            {dashboard_path: "dashboard", os_path: "os", pixel_path: "pixel"}
        )

    def test_os_and_dashboard_renderers_share_contract_values(self) -> None:
        dashboard_text = ts_render.render_dashboard_ts(SNAPSHOT)
        os_text = ts_render.render_codexdojo_os_ts(SNAPSHOT)

        for expected in (
            'id: "U-BRIDGE"',
            'state: "evaluating"',
            'implementationBlocked: true',
            'current: 3',
            'masteredCount: 2',
            'scaffoldedCount: 16',
        ):
            self.assertIn(expected, dashboard_text)
            self.assertIn(expected, os_text)


if __name__ == "__main__":
    unittest.main()
