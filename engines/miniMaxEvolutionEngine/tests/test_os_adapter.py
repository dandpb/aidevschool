import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest

from engines.openclaw.errors import StateCorruptionError
from engines.miniMaxEvolutionEngine.os_adapter import REPO_ROOT, prepare_workflow


class EvolutionOsAdapterTest(unittest.TestCase):
    def test_session_start_hook_reports_yaml_machine_source(self) -> None:
        hook = REPO_ROOT / "engines/miniMaxEvolutionEngine/.claude/hooks/briefing.sh"
        result = subprocess.run(
            ["bash", str(hook)],
            cwd=REPO_ROOT,
            env={**os.environ, "CLAUDE_PROJECT_DIR": str(REPO_ROOT)},
            capture_output=True,
            check=True,
            text=True,
        )

        self.assertIn(
            f"Pipeline source: {REPO_ROOT / 'learner/pipeline_status.yaml'}",
            result.stdout,
        )

    def test_prefers_sibling_yaml_status_over_conflicting_markdown(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            status = root / "pipeline_status.md"
            learning = root / "learning_state.yaml"
            commands = root / "commands"
            commands.mkdir()
            (commands / "implement.md").write_text("implement contract", encoding="utf-8")
            (commands / "next.md").write_text("next contract", encoding="utf-8")
            status.write_text(
                """- **current_project**: `curriculum/markdown-project`
- **phase**: cycle-complete
- **awaiting**: `markdown-curator`
""",
                encoding="utf-8",
            )
            status.with_suffix(".yaml").write_text(
                """current_project: curriculum/yaml-project
phase: spec-done
awaiting: yaml-implementer
""",
                encoding="utf-8",
            )
            learning.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")

            receipt = prepare_workflow(status, learning, commands)

            self.assertIn(f"Pipeline source: {status.with_suffix('.yaml')}", receipt)
            self.assertIn("Project: curriculum/yaml-project", receipt)
            self.assertIn("Phase: spec-done · awaiting: yaml-implementer", receipt)
            self.assertIn("Next Claude Code command: /devschool-implement", receipt)

    def test_propagates_malformed_sibling_yaml(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            status = root / "pipeline_status.md"
            learning = root / "learning_state.yaml"
            commands = root / "commands"
            commands.mkdir()
            status.write_text("- **phase**: cycle-complete\n", encoding="utf-8")
            status.with_suffix(".yaml").write_text("phase: [broken\n", encoding="utf-8")
            learning.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")

            with self.assertRaisesRegex(StateCorruptionError, "pipeline_status.yaml"):
                prepare_workflow(status, learning, commands)

    def test_prepares_existing_next_command_without_advancing_state(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            status = root / "pipeline_status.md"
            learning = root / "learning_state.yaml"
            commands = root / "commands"
            commands.mkdir()
            (commands / "next.md").write_text("next contract", encoding="utf-8")
            machine_status = status.with_suffix(".yaml")
            machine_status.write_text(
                "current_project: curriculum/02_key_value_store\n"
                "phase: cycle-complete\n"
                "awaiting: next-curator\n",
                encoding="utf-8",
            )
            learning.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")
            before = {path: path.read_bytes() for path in (machine_status, learning)}

            receipt = prepare_workflow(status, learning, commands)

            self.assertIn(f"Pipeline source: {machine_status}", receipt)
            self.assertIn("Next Claude Code command: /devschool-next", receipt)
            self.assertIn("Phase: cycle-complete · awaiting: next-curator", receipt)
            self.assertIn("does not execute a phase or advance state", receipt)
            self.assertEqual(
                before,
                {path: path.read_bytes() for path in (machine_status, learning)},
            )

    def test_routes_a_blocked_learning_gate_to_diagnosis(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            status = root / "pipeline_status.md"
            learning = root / "learning_state.yaml"
            commands = root / "commands"
            commands.mkdir()
            (commands / "diagnose.md").write_text("diagnose contract", encoding="utf-8")
            status.with_suffix(".yaml").write_text(
                "current_project: curriculum/03_url_shortener\n"
                "phase: spec-done\n"
                "awaiting: dev-node\n",
                encoding="utf-8",
            )
            learning.write_text("gate:\n  implementation_blocked: true\n", encoding="utf-8")

            receipt = prepare_workflow(status, learning, commands)

            self.assertIn("Next Claude Code command: /devschool-diagnose", receipt)


if __name__ == "__main__":
    unittest.main()
