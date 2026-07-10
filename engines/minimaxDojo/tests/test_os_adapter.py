from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from engines.minimaxDojo.os_adapter import prepare_tutor_session


class TutorOsAdapterTest(unittest.TestCase):
    def test_prepares_a_source_labelled_socratic_entrypoint_without_writes(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / "learning_state.yaml"
            config = root / "learner.yaml"
            state.write_text(
                """learner:
  id: learner-1
  active_language: TypeScript
active_unit:
  id: U-1
  title: Retry boundaries
  state: practicing
gate:
  implementation_blocked: true
""",
                encoding="utf-8",
            )
            config.write_text("socrates:\n  quota_dia: 12\n", encoding="utf-8")
            before = {path: path.read_bytes() for path in (state, config)}

            receipt = prepare_tutor_session(state, config)

            self.assertIn("Socrates / STAP checking", receipt)
            self.assertIn("U-1 · Retry boundaries · state=practicing", receipt)
            self.assertIn("implementation_blocked=true", receipt)
            self.assertIn("cannot mark mastery", receipt)
            self.assertEqual(before, {path: path.read_bytes() for path in (state, config)})


if __name__ == "__main__":
    unittest.main()
