from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from engines.miniMaxEvolutionEngine.os_adapter import prepare_workflow


class EvolutionOsAdapterTest(unittest.TestCase):
    def test_prepares_existing_next_command_without_advancing_state(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            status = root / "pipeline_status.md"
            learning = root / "learning_state.yaml"
            commands = root / "commands"
            commands.mkdir()
            (commands / "next.md").write_text("next contract", encoding="utf-8")
            status.write_text(
                """- **current_project**: `curriculum/02_key_value_store`
- **phase**: cycle-complete
- **awaiting**: `next-curator`
""",
                encoding="utf-8",
            )
            learning.write_text("gate:\n  implementation_blocked: false\n", encoding="utf-8")
            before = {path: path.read_bytes() for path in (status, learning)}

            receipt = prepare_workflow(status, learning, commands)

            self.assertIn("Next Claude Code command: /devschool-next", receipt)
            self.assertIn("Phase: cycle-complete · awaiting: next-curator", receipt)
            self.assertIn("does not execute a phase or advance state", receipt)
            self.assertEqual(before, {path: path.read_bytes() for path in (status, learning)})

    def test_routes_a_blocked_learning_gate_to_diagnosis(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            status = root / "pipeline_status.md"
            learning = root / "learning_state.yaml"
            commands = root / "commands"
            commands.mkdir()
            (commands / "diagnose.md").write_text("diagnose contract", encoding="utf-8")
            status.write_text(
                """- **current_project**: `curriculum/03_url_shortener`
- **phase**: impl
- **awaiting**: `dev-node`
""",
                encoding="utf-8",
            )
            learning.write_text("gate:\n  implementation_blocked: true\n", encoding="utf-8")

            receipt = prepare_workflow(status, learning, commands)

            self.assertIn("Next Claude Code command: /devschool-diagnose", receipt)


if __name__ == "__main__":
    unittest.main()
