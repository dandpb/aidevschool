from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from learner.substrate.dashboard_data import (
    load_dashboard_data,
    render_agents_ts,
    render_cycle_ts,
    render_ts_value,
)


CONFIG = """user_facing_agents:
  - {id: mentor, name: Mentor, responsibility: Guides, expandsTo: [maestro]}
agents:
  - {id: maestro, name: MAESTRO, group: leader, role: Leader, mission: Coordinate, inputs: [spec], outputs: [report], gate: verifier PASS, prompt: Coordinate safely.}
cycle_stages:
  - {id: diagnose, label: Diagnose, owner: Mentor, evidence: attempt, output: profile}
metrics:
  - {id: coverage, label: Coverage, target: ">=80%", signal: Protects core}
"""


class TestDashboardData(unittest.TestCase):
    def test_agents_and_cycle_render_from_explicit_yaml(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "dashboard.yaml"
            path.write_text(CONFIG, encoding="utf-8")

            data = load_dashboard_data(path)
            agents = render_agents_ts(data)
            cycle = render_cycle_ts(data)

        self.assertIn("AUTO-GENERATED", agents)
        self.assertIn('id: "maestro"', agents)
        self.assertIn("AUTO-GENERATED", cycle)
        self.assertIn('id: "coverage"', cycle)

    def test_unsafe_object_keys_are_json_quoted_and_cannot_inject_typescript(self) -> None:
        rendered = render_ts_value(
            {
                "punctuated-key": "safe",
                'key\"; globalThis.compromised = true; //': "still data",
            },
            0,
        )

        self.assertIn('"punctuated-key": "safe"', rendered)
        self.assertIn(
            '"key\\\"; globalThis.compromised = true; //": "still data"',
            rendered,
        )
        self.assertNotIn('\n  key"; globalThis.compromised', rendered)

    def test_rendering_is_deterministic(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "dashboard.yaml"
            path.write_text(CONFIG, encoding="utf-8")
            data = load_dashboard_data(path)

        self.assertEqual(render_agents_ts(data), render_agents_ts(data))
        self.assertEqual(render_cycle_ts(data), render_cycle_ts(data))


if __name__ == "__main__":
    unittest.main()
