import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


class TestEngineTopology(unittest.TestCase):
    def test_minimax_evolution_engine_links_shared_substrates(self) -> None:
        engine = ROOT / "engines" / "miniMaxEvolutionEngine"
        expected_targets = {
            "curriculum": "../../curriculum",
            "learner": "../../learner",
            "docs": "../../docs",
            ".mavis": "../../.mavis",
        }

        for name, target in expected_targets.items():
            with self.subTest(name=name):
                link = engine / name
                self.assertTrue(link.is_symlink(), f"{name} must remain a symlink")
                self.assertEqual(link.readlink().as_posix(), target)

    def test_engines_do_not_copy_shared_curriculum_or_learner_state(self) -> None:
        engine_names = (
            "pixelDojo",
            "codexDojo",
            "minimaxDojo",
            "openclaw",
            "voxelDojo",
        )

        for name in engine_names:
            with self.subTest(engine=name, shared_state="curriculum"):
                self.assertFalse((ROOT / "engines" / name / "curriculum").exists())
            with self.subTest(engine=name, shared_state="learner"):
                self.assertFalse((ROOT / "engines" / name / "learner").exists())
