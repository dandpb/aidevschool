#!/usr/bin/env python3
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class TestMiniMaxEvolutionEngineContract(unittest.TestCase):
    def setUp(self):
        self.engine = ROOT / "engines" / "miniMaxEvolutionEngine"

    def test_shared_substrates_remain_symlinks(self):
        expected_targets = {
            "curriculum": "../../curriculum",
            "learner": "../../learner",
            "docs": "../../docs",
            ".mavis": "../../.mavis",
        }
        for name, target in expected_targets.items():
            with self.subTest(name=name):
                link = self.engine / name
                self.assertTrue(link.is_symlink(), f"{name} must remain a symlink")
                self.assertEqual(link.readlink().as_posix(), target)

    def test_phase_commands_keep_producer_verifier_separation(self):
        phaserunner = self.engine / ".claude" / "commands" / "devschool" / "phaserunner.md"
        body = phaserunner.read_text(encoding="utf-8")

        self.assertIn("Verifier never shares producer context", body)
        self.assertIn("Status advances only on PASS", body)
        self.assertIn("learning_gate_check", body)
        self.assertIn("implementation_blocked", body)

    def test_cloud_recurring_schedules_require_confirmation(self):
        claude = (self.engine / "CLAUDE.md").read_text(encoding="utf-8")

        self.assertIn("peça confirmação ao usuário antes de criar", claude)
        self.assertIn("nunca crie sozinho", claude)


class TestPolyglotArenaDesignContract(unittest.TestCase):
    """The polyglot arena was demoted from `engines/polyglotEvolutionArena/` to
    `docs/design/polyglot-arena/` on 2026-06-21. The engine root no longer exists;
    the design material lives at the design path and the loop lives in
    `miniMaxEvolutionEngine/`. This test pins that the demoted archive stays at
    `proposal` until executable scaffold + test harness + comparison runner appear.
    """

    design = ROOT / "docs" / "design" / "polyglot-arena"

    def test_status_stays_proposal_until_runtime_scaffold_exists(self):
        status = (self.design / "STATUS.md").read_text(encoding="utf-8")

        self.assertIn("proposal", status)
        self.assertIn("executable scaffold", status)
        self.assertIn("test harness", status)
        self.assertIn("comparison runner", status)

    def test_current_surface_is_only_proposal_material(self):
        files = {path.name for path in self.design.iterdir() if path.is_file()}
        self.assertEqual(
            files,
            {"STATUS.md", "project_proposal.md", "bootstrap_prompt.md"},
            "polyglot-arena archive should hold only design material; no executable code",
        )


class TestPixelDojoContract(unittest.TestCase):
    """arcadeAcademy/ was merged into pixelDojo/ on 2026-06-21 (duplicate root).
    The 8-bit teaching-game engine contract now lives at pixelDojo/; the key
    property is that the game emits raw evidence only, never `mastered`.
    """

    engine = ROOT / "engines" / "pixelDojo"

    def test_arcade_academy_root_no_longer_exists(self):
        """Deletion test for the duplicate engine root."""
        self.assertFalse(
            (ROOT / "engines" / "arcadeAcademy").exists(),
            "engines/arcadeAcademy/ was merged into engines/pixelDojo/ on 2026-06-21; "
            "resurrecting it would re-introduce the duplicate-root problem.",
        )

    def test_playbook_preserves_attempt_surface_verifier_boundary(self):
        agents = (self.engine / "AGENTS.md").read_text(encoding="utf-8")
        plan = (self.engine / "PLAN.md").read_text(encoding="utf-8")

        self.assertIn("Every game targets exactly one concept", agents)
        self.assertIn("emits **raw evidence only**", agents)
        self.assertIn("The game never writes `mastered`", agents)
        self.assertIn("Game never does this", plan)
        self.assertIn("Verifier (separate context)", plan)

    def test_engine_does_not_copy_shared_curriculum_or_learner_state(self):
        self.assertFalse((self.engine / "curriculum").exists())
        self.assertFalse((self.engine / "learner").exists())


class TestCodexDojoContract(unittest.TestCase):
    """codexDojo is the user-facing pnpm dashboard: a read-only view of the shared
    learner state. It stays a self-contained Node app under engines/codexDojo/."""

    engine = ROOT / "engines" / "codexDojo"

    def test_is_a_pnpm_app_with_lint_test_build(self):
        package = (self.engine / "package.json").read_text(encoding="utf-8")
        for script in ('"lint"', '"test"', '"build"'):
            self.assertIn(script, package, f"package.json must keep a {script} script")
        self.assertTrue((self.engine / "src").is_dir(), "src/ must exist")

    def test_engine_does_not_copy_shared_curriculum_or_learner_state(self):
        self.assertFalse((self.engine / "curriculum").exists())
        self.assertFalse((self.engine / "learner").exists())


class TestMinimaxDojoContract(unittest.TestCase):
    """minimaxDojo is the tutoring core: a tested Python reference implementation
    (core/ + tests/) with numeric thresholds single-sourced in config/learner.yaml."""

    engine = ROOT / "engines" / "minimaxDojo"

    def test_core_and_tests_exist(self):
        self.assertTrue((self.engine / "core").is_dir(), "core/ must exist")
        self.assertTrue((self.engine / "tests").is_dir(), "tests/ must exist")
        self.assertTrue(
            any((self.engine / "tests").glob("test_*.py")),
            "tests/ must keep contract tests for the state machine",
        )

    def test_thresholds_stay_single_sourced_in_config(self):
        self.assertTrue(
            (self.engine / "config" / "learner.yaml").is_file(),
            "config/learner.yaml is the single source for tutor-core numeric thresholds",
        )

    def test_engine_does_not_copy_shared_curriculum_or_learner_state(self):
        self.assertFalse((self.engine / "curriculum").exists())
        self.assertFalse((self.engine / "learner").exists())


class TestOpenclawContract(unittest.TestCase):
    """openclaw is the file-based continuous-runner tracer bullet: Hermes bus +
    scheduler + adapters, simulate mode only, producer/verifier separation."""

    engine = ROOT / "engines" / "openclaw"

    def test_runner_hermes_and_tests_exist(self):
        self.assertTrue((self.engine / "runner" / "scheduler.py").is_file())
        self.assertTrue((self.engine / "runner" / "adapters").is_dir())
        self.assertTrue((self.engine / "hermes" / "bus.py").is_file())
        self.assertTrue((self.engine / "tests").is_dir())

    def test_cli_stays_simulate_only(self):
        """Real AI dispatch is an explicit future override, never a silent default."""
        main = (self.engine / "__main__.py").read_text(encoding="utf-8")
        self.assertIn('choices=["simulate"]', main)
        self.assertIn("NotImplementedError", main)

    def test_playbook_preserves_producer_verifier_separation(self):
        agents = (self.engine / "AGENTS.md").read_text(encoding="utf-8")
        verifier = (self.engine / "runner" / "adapters" / "verifier.py").read_text(encoding="utf-8")

        self.assertIn("The verifier adapter never shares state with a producer adapter", agents)
        self.assertIn("never shares producer state", verifier)

    def test_bus_state_lives_under_mavis_hermes(self):
        bus = (self.engine / "hermes" / "bus.py").read_text(encoding="utf-8")
        self.assertIn('".mavis" / "hermes"', bus)

    def test_engine_does_not_copy_shared_curriculum_or_learner_state(self):
        self.assertFalse((self.engine / "curriculum").exists())
        self.assertFalse((self.engine / "learner").exists())


class TestVoxelDojoContract(unittest.TestCase):
    """voxelDojo is the 3D teaching-simulation engine. Its pilot
    (game-10-hash-ring) is under active construction, so this contract pins only
    the stable engine surface: the root docs that define the engine's rules."""

    engine = ROOT / "engines" / "voxelDojo"

    def test_stable_engine_surface_exists(self):
        self.assertTrue(self.engine.is_dir(), "engines/voxelDojo/ must exist")
        self.assertTrue((self.engine / "README.md").is_file())
        self.assertTrue((self.engine / "PLAN.md").is_file())
        self.assertTrue((self.engine / "docs").is_dir())

    def test_engine_does_not_copy_shared_curriculum_or_learner_state(self):
        self.assertFalse((self.engine / "curriculum").exists())
        self.assertFalse((self.engine / "learner").exists())


if __name__ == "__main__":
    unittest.main()
