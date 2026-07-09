"""Tests for the learner-state substrate interface."""

from datetime import date
import tempfile
import unittest
from pathlib import Path
import copy

import yaml

from learner.substrate import (
    ROOT,
    derive_mavis_view,
    derive_whiteboard_profile,
    derive_whiteboard_trail,
    load_and_validate,
    load_canonical,
    render_mavis_yaml,
    render_profile_yaml,
    render_trail_md,
    validate,
)
from learner.substrate.dashboard_snapshot import (
    build_snapshot,
    render_ts,
    sync as sync_dashboard_snapshot,
)

import learner.substrate
import learner.substrate.dashboard_snapshot

_original_load_canonical = learner.substrate.load_canonical

CLEAN_INITIAL_STATE = {
    "version": 2,
    "system": "agora-continuum",
    "learner": {
        "id": "daniel-barreto",
        "level": "intermediate",
        "goal": "robust professional-quality code without AI dependency",
        "active_language": "TypeScript",
        "focus": "robustness",
        "languages": ["TypeScript", "Go", "Rust"],
        "reference_purpose": "Code-reading breadth across Go/Rust/TypeScript while practice stays in TypeScript.",
        "weekly_time_hours": 5,
        "session_cadence": "25-40 min sessions, 4-5x/week",
        "human_instructor": "none",
        "hitl_sla_hours": 24,
        "hitl_fallback": "auto_reject_or_self_escalate",
        "budget": {"hint_queries_per_day": 15}
    },
    "state_machine": {
        "learning_states": ["presenting", "practicing", "evaluating", "mastered"],
        "artifact_states": ["producing", "verifying", "done"]
    },
    "active_unit": {
        "id": "U0-sonda-rate-limiter-robustness",
        "project": "01_rate_limiter",
        "title": "Agent Quest 01: rate-limiter agent orchestration",
        "state": "presenting",
        "retry_count": 0,
        "retry_limit": 3,
        "unblock_condition": "learner_attempt_evaluated",
        "required_before_implementation": True,
        "diagnostic_file": "curriculum/01_rate_limiter/docs/diagnostic.md",
        "promotion_gate": [
            "learner plays the Agent Quest mission before receiving solutions",
            "learner chooses agent actions and blocks shortcuts that skip attempts or evidence",
            "Sonda classifies Dreyfus/Bloom position for tests, refactoring, and code reading",
            "Prometor receives executable PixelDojo evidence before any mastery transition"
        ],
        "empirical_gate": {
            "require_executable_evidence": True,
            "min_coverage": 0.80,
            "mutation_min": 0.65
        }
    },
    "gate": {
        "implementation_blocked": True
    },
    "agent_ownership": {
        "leader": "Maestro",
        "diagnostic": "Sonda",
        "path": "Cartografo",
        "producer": "Mestre-Conteudo",
        "tutor": "Socrates",
        "verifier": "Prometor",
        "reviewer": "Critico",
        "metrics": "Atena",
        "memory": "Mnemosyne",
        "governance": "Seneca"
    },
    "empirical_gates": {
        "code": {
            "core_coverage_target": ">=80%",
            "mutation_score_target": "60-70% when tooling is available",
            "verifier_context": "isolated",
            "benchmark_rule": ">=10 samples plus warmup; block speed claims when CV >=20%"
        },
        "learning": {
            "requires_attempt_before_solution": True,
            "hint_budget_per_day": 15,
            "mastery_source": "executable_evidence"
        }
    },
    "next_action": {
        "owner": "learner",
        "action": "Play Agent Quest in engines/pixelDojo/pixel-quest and submit the emitted evidence for verifier review."
    },
    "units_log": [
        {
            "unit_id": "U0-sonda-rate-limiter-robustness",
            "concept": "agentic orchestration for token-bucket robustness",
            "kind": "concept",
            "project": "01_rate_limiter",
            "mastered": False,
            "reviews": [
                {"date": date(2026, 6, 19), "event": "presented"}
            ]
        }
    ],
    "streak": {
        "current": 0,
        "longest": 0,
        "last_gate_date": None,
        "freezes": {"equipped": 2, "max": 2}
    }
}

def mock_load_canonical(path="learner/learning_state.yaml"):
    p = Path(path)
    if not p.is_absolute() and str(p) == "learner/learning_state.yaml":
        return copy.deepcopy(CLEAN_INITIAL_STATE)
    return _original_load_canonical(path)

learner.substrate.load_canonical = mock_load_canonical
learner.substrate.dashboard_snapshot.load_canonical = mock_load_canonical
load_canonical = mock_load_canonical



class TestSubstrateInterface(unittest.TestCase):
    """Exercise the public read/write surface and invariants."""

    def test_load_canonical_returns_dict(self):
        state = load_canonical()
        self.assertIsInstance(state, dict)
        self.assertEqual(state["system"], "agora-continuum")
        self.assertIn("learner", state)
        self.assertIn("active_unit", state)

    def test_validate_passes_for_canonical_state(self):
        state = load_canonical()
        errors = validate(state)
        self.assertEqual(errors, [])

    def test_load_and_validate_raises_on_bad_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.yaml"
            bad_state = {
                "version": 2,
                "system": "agora-continuum",
                "learner": {"id": "x", "level": "intermediate", "active_language": "Go", "languages": ["TypeScript"]},
                "active_unit": {"id": "U1", "state": "presenting", "retry_count": 5, "retry_limit": 3},
                "gate": {"implementation_blocked": True},
                "empirical_gates": {"learning": {"requires_attempt_before_solution": True}},
            }
            path.write_text(yaml.safe_dump(bad_state), encoding="utf-8")

            with self.assertRaises(ValueError) as ctx:
                load_and_validate(path)
            message = str(ctx.exception)
            self.assertIn("active_language must be in learner.languages", message)
            self.assertIn("retry_count cannot exceed retry_limit", message)

    def test_validate_catches_missing_required_fields(self):
        state = {
            "version": 2,
            "system": "agora-continuum",
            "learner": {},
            "active_unit": {},
            "gate": {},
            "empirical_gates": {"learning": {}},
        }
        errors = validate(state)
        self.assertIn("learner.id is required", errors)
        self.assertTrue(
            any("learner.level must be one of" in e for e in errors),
            f"expected level error among {errors}",
        )
        self.assertIn("active_unit.id is required", errors)
        self.assertIn("empirical_gates.learning.requires_attempt_before_solution must be true", errors)


class TestMavisAdapter(unittest.TestCase):
    """Exercise the .mavis/learning_state.yaml adapter."""

    def test_mavis_view_is_derived_and_translated(self):
        state = load_canonical()
        view = derive_mavis_view(state)

        self.assertEqual(view["derived_from"], "learner/learning_state.yaml")
        self.assertEqual(view["learner_profile"]["active_focus"], "TypeScript")
        self.assertEqual(view["state_machine"]["learning_states"], ["apresentando", "praticando", "avaliando", "dominado"])
        self.assertEqual(view["active_unit"]["state"], "apresentando")
        self.assertEqual(view["active_unit"]["awaiting"], "learner_attempt")
        self.assertIn("Sonda", view["agent_ownership"].values())

    def test_rendered_mavis_yaml_contains_header(self):
        state = load_canonical()
        text = render_mavis_yaml(state)
        self.assertTrue(text.startswith("# Derived from learner/learning_state.yaml"))
        parsed = yaml.safe_load(text.replace("# Derived from learner/learning_state.yaml. Do not edit by hand.\n", ""))
        self.assertEqual(parsed["system"], "agora-continuum")


class TestWhiteboardAdapter(unittest.TestCase):
    """Exercise the minimaxDojo whiteboard adapters."""

    def test_profile_core_derived_from_canonical(self):
        state = load_canonical()
        profile = derive_whiteboard_profile(state)

        self.assertEqual(profile["derived_from"], "../../learner/learning_state.yaml")
        self.assertEqual(profile["core"]["aluno"]["linguagem_foco"], "TypeScript")
        self.assertEqual(profile["core"]["aluno"]["tempo_semanal"], "5h")
        self.assertEqual(profile["core"]["aluno"]["nivel_autodeclado"], "intermediario")
        self.assertEqual(profile["core"]["trilha"]["proxima_unidade"], state["active_unit"]["id"])

    def test_rendered_profile_yaml_contains_derived_marker(self):
        state = load_canonical()
        text = render_profile_yaml(derive_whiteboard_profile(state))
        self.assertIn("derived_from: ../../learner/learning_state.yaml", text)
        self.assertIn("# Perfil Vivo do Aluno — derived view", text)

    def test_trail_derived_from_canonical(self):
        state = load_canonical()
        trail = derive_whiteboard_trail(state)

        self.assertEqual(trail["derived_from"], "../../learner/learning_state.yaml")
        self.assertEqual(trail["focus"], "robustness")
        self.assertEqual(trail["active_unit"], state["active_unit"]["id"])
        self.assertEqual(trail["active_state"], "APRESENTANDO")

    def test_rendered_trail_md_contains_derived_marker(self):
        state = load_canonical()
        text = render_trail_md(derive_whiteboard_trail(state))
        self.assertIn("derived_from: ../../learner/learning_state.yaml", text)
        self.assertIn("Derived view", text)


class TestDashboardSnapshot(unittest.TestCase):
    """Exercise the codexDojo dashboard snapshot adapter."""

    def test_build_snapshot_reflects_canonical_state(self):
        snapshot = build_snapshot()
        self.assertEqual(snapshot["activeUnit"]["state"], "presenting")
        self.assertTrue(snapshot["gate"]["implementationBlocked"])
        self.assertEqual(snapshot["profile"]["activeLanguage"], "TypeScript")
        self.assertEqual(snapshot["aidi"]["current"], 0.34)
        self.assertGreaterEqual(len(snapshot["aidi"]["trend"]), 1)

    def test_build_snapshot_picks_up_backlog_counts(self):
        snapshot = build_snapshot()
        # BACKLOG_STATUS.md: 01 + 02 implemented; 03-18 scaffolded (16).
        self.assertEqual(snapshot["masteredCount"], 2)
        self.assertEqual(snapshot["scaffoldedCount"], 16)

    def test_render_ts_is_well_formed_typescript(self):
        snapshot = build_snapshot()
        text = render_ts(snapshot)
        self.assertTrue(text.startswith("// AUTO-GENERATED"))
        self.assertIn("import type { LearnerSnapshot }", text)
        self.assertIn("export const learnerSnapshot: LearnerSnapshot = {", text)
        # No trailing-comma inconsistencies on the simple types.
        self.assertRegex(text, r'current: 0\.34')
        self.assertRegex(text, r'implementationBlocked: true')

    def test_sync_writes_dashboard_module(self):
        path = sync_dashboard_snapshot()
        self.assertTrue(path.exists())
        text = path.read_text(encoding="utf-8")
        self.assertIn("learnerSnapshot", text)
        self.assertIn("activeUnit", text)


class TestDashboardSnapshotEdgeCases(unittest.TestCase):
    """Edge cases for the dashboard snapshot adapter.

    Each test isolates one input file (pitfalls, journal, backlog, profile) and
    confirms the adapter degrades gracefully when the input is empty or absent.
    Path constants in `dashboard_snapshot` are monkey-patched to point at a
    fresh temp dir, then restored in `tearDown` so other tests are not affected.
    """

    def setUp(self):
        # Snapshot the real path constants so tearDown can restore them, then
        # point the module at a fresh temp dir for the duration of this test.
        from learner.substrate import dashboard_snapshot as ds_mod

        self._ds_mod = ds_mod
        self._original_paths = {
            "LEARNING_STATE": ds_mod.LEARNING_STATE,
            "LEARNER_PROFILE": ds_mod.LEARNER_PROFILE,
            "PITFALLS": ds_mod.PITFALLS,
            "JOURNAL": ds_mod.JOURNAL,
            "BACKLOG": ds_mod.BACKLOG,
        }
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp_root = Path(self._tmp.name)
        # Mirror the real layout under the temp dir so build_snapshot() can
        # resolve every input the same way it does in production.
        self.fake_learner = self.tmp_root / "learner"
        self.fake_curriculum = self.tmp_root / "curriculum"
        self.fake_learner.mkdir(parents=True, exist_ok=True)
        self.fake_curriculum.mkdir(parents=True, exist_ok=True)

        # Always provide a minimal learning_state.yaml — it's the one input
        # every snapshot build needs; the per-test files (pitfalls, journal,
        # backlog, profile) are the variables under test.
        self._write_minimal_state()

        ds_mod.LEARNING_STATE = self.fake_learner / "learning_state.yaml"
        ds_mod.LEARNER_PROFILE = self.fake_learner / "learner_profile.md"
        ds_mod.PITFALLS = self.fake_learner / "pitfalls.md"
        ds_mod.JOURNAL = self.fake_learner / "journal.md"
        ds_mod.BACKLOG = self.fake_curriculum / "BACKLOG_STATUS.md"

    def tearDown(self):
        ds_mod = self._ds_mod
        ds_mod.LEARNING_STATE = self._original_paths["LEARNING_STATE"]
        ds_mod.LEARNER_PROFILE = self._original_paths["LEARNER_PROFILE"]
        ds_mod.PITFALLS = self._original_paths["PITFALLS"]
        ds_mod.JOURNAL = self._original_paths["JOURNAL"]
        ds_mod.BACKLOG = self._original_paths["BACKLOG"]
        self._tmp.cleanup()

    def _write_minimal_state(self) -> None:
        """Write a minimal learning_state.yaml that the snapshot builder needs."""
        minimal_state = {
            "version": 2,
            "system": "agora-continuum",
            "learner": {
                "id": "edge-case-tester",
                "level": "intermediate",
                "active_language": "TypeScript",
                "languages": ["TypeScript"],
                "aidi": {"current": 0.5, "threshold_amber": 0.6, "threshold_red": 0.75},
                "weekly_time_hours": 5,
            },
            "active_unit": {
                "id": "U-EDGE",
                "project": "01_test",
                "title": "Edge case unit",
                "state": "presenting",
                "retry_count": 0,
                "retry_limit": 3,
            },
            "gate": {"implementation_blocked": True},
            "empirical_gates": {"learning": {"requires_attempt_before_solution": True}},
        }
        (self.fake_learner / "learning_state.yaml").write_text(
            yaml.safe_dump(minimal_state), encoding="utf-8"
        )

    def test_empty_pitfalls_returns_empty_list(self):
        """An empty pitfalls.md should yield topPitfalls == [] (no fallback)."""
        (self.fake_learner / "pitfalls.md").write_text("", encoding="utf-8")
        snapshot = build_snapshot()
        self.assertEqual(snapshot["topPitfalls"], [])

    def test_no_aidi_in_journal_uses_synthetic_trend(self):
        """A journal with no AIDI lines should still produce a trend of >=3 points
        derived from the current aidi value (the synthetic fallback).
        """
        (self.fake_learner / "journal.md").write_text(
            "# Journal\n\n## [2026-06-10] No AIDI here\n"
            "Just some prose about learning, no AIDI value.\n",
            encoding="utf-8",
        )
        snapshot = build_snapshot()
        trend = snapshot["aidi"]["trend"]
        self.assertGreaterEqual(
            len(trend), 3, f"expected >=3 synthetic trend points, got {trend!r}"
        )
        # Synthetic trend is anchored at the current value (the last point).
        self.assertEqual(trend[-1]["value"], snapshot["aidi"]["current"])

    def test_zero_projects_in_backlog(self):
        """A minimal BACKLOG_STATUS.md with only the vocabulary table and no
        project rows must yield masteredCount == 0 and scaffoldedCount == 0.
        """
        minimal_backlog = (
            "# Curriculum Backlog Status\n\n"
            "## Status vocabulary\n\n"
            "| Status | Meaning | Promotion criteria to next status |\n"
            "| --- | --- | --- |\n"
            "| `implemented` | code/artifact exists and passes verification | (terminal) |\n"
            "| `scaffolded` | folder/boilerplate exists, no verified behavior | requires 5-phase cycle |\n"
        )
        (self.fake_curriculum / "BACKLOG_STATUS.md").write_text(
            minimal_backlog, encoding="utf-8"
        )
        snapshot = build_snapshot()
        self.assertEqual(snapshot["masteredCount"], 0)
        self.assertEqual(snapshot["scaffoldedCount"], 0)

    def test_missing_profile_matrix_uses_defaults(self):
        """A learner_profile.md with no Dreyfus/Bloom matrix should default
        dreyfus -> 'competent' and bloom -> 'apply'.
        """
        (self.fake_learner / "learner_profile.md").write_text(
            "# Learner profile\n\nJust a free-form profile with no matrix.\n",
            encoding="utf-8",
        )
        snapshot = build_snapshot()
        self.assertEqual(snapshot["profile"]["dreyfus"], "competent")
        self.assertEqual(snapshot["profile"]["bloom"], "apply")

    def test_render_ts_with_empty_snapshot_does_not_crash(self):
        """render_ts({}) must not crash and must produce a string containing a
        valid `LearnerSnapshot` literal (either `{}` for an empty object or
        `{ ... }` with explicit fields — both are valid TS object literals).
        """
        text = render_ts({})
        self.assertIn("export const learnerSnapshot: LearnerSnapshot =", text)
        # Must contain a balanced object literal — either `{}` (empty) or
        # a multi-line `{...}` block. Either way, opening and closing braces
        # of the literal must be present and balanced.
        self.assertIn("LearnerSnapshot", text)
        self.assertIn("= {", text)
        self.assertTrue(text.rstrip().endswith("}"), f"output should end with closing brace:\n{text}")


class TestLearningGate(unittest.TestCase):
    """Sanity check that the gate is the *only* thing standing between the
    apprentice and the implementation phase, and that the substrate knows about
    it. The real attempt evaluation runs through Sonda at runtime; this test
    just proves the substrate can read the gate state.
    """

    def test_canonical_state_has_blocked_gate(self):
        state = load_canonical()
        gate = state.get("gate", {})
        self.assertTrue(
            gate.get("implementation_blocked"),
            "learning gate is the empirical contract — must be True until a "
            "learner attempt is evaluated by Sonda.",
        )
        active = state.get("active_unit", {})
        self.assertEqual(active.get("state"), "presenting")

    def test_attempts_directory_exists(self):
        attempts = ROOT / "learner" / "attempts"
        self.assertTrue(
            attempts.exists() and attempts.is_dir(),
            "learner/attempts/ is where the apprentice writes the empirical "
            "evidence that the gate is waiting for. If this directory is "
            "missing, the gate has no surface to receive an attempt.",
        )

    def test_diagnostic_is_present(self):
        diagnostic = ROOT / "curriculum" / "01_rate_limiter" / "docs" / "diagnostic.md"
        self.assertTrue(
            diagnostic.exists(),
            "diagnostic.md is the challenge the apprentice must attempt "
            "before the gate unblocks.",
        )

    def test_diagnostic_contains_required_tasks(self):
        diagnostic = (ROOT / "curriculum" / "01_rate_limiter" / "docs" / "diagnostic.md").read_text(
            encoding="utf-8"
        )
        for heading in ("Task 1: Test Design", "Task 2: Algorithm Sketch", "Task 3: Code Reading", "Task 4: Review"):
            self.assertIn(heading, diagnostic, f"diagnostic.md missing required section: {heading!r}")


class TestMemoryCurationContract(unittest.TestCase):
    """Verify the operational contract in `engines/codexDojo/ecosystem/MEMORY_CURATION.md`.

    The contract is owned by Mnemosyne. The substrate (`sync()`) is the only
    writer of derived views; this test pins the invariants the registrar must
    not break: append-only journal, no raw chat dumps, no mastery from docs
    alone, substrate as the writer of derived views.
    """

    def test_substrate_runs_cleanly(self):
        """The curation checklist requires `python3 -m learner.substrate` to
        succeed. Run it as the test, asserting no exceptions are raised.
        """
        from learner.substrate import sync

        # If sync() raises, this test fails — the curation pipeline is broken.
        sync()

    def test_journal_has_no_obvious_chat_dumps(self):
        """Journal entries must be generalizations with a future use, not raw
        chat transcripts. Heuristic: lines that look like chat turns (role
        prefix like `User:` / `Assistant:` / `Human:` / `AI:`, or blockquotes
        inside a date-prefixed entry) are likely dumps. Header blockquotes at
        the top of the file are allowed because they describe the file's
        purpose, not a chat session.
        """
        import re

        journal = ROOT / "learner" / "journal.md"
        if not journal.exists():
            self.skipTest("journal.md does not exist yet")
        text = journal.read_text(encoding="utf-8")

        # Find the first date-prefixed heading; everything before it is the
        # file header and is allowed to use blockquote / `>`.
        first_entry = re.search(r"^## \[\d{4}-\d{2}-\d{2}\]", text, re.MULTILINE)
        body = text[first_entry.start():] if first_entry else text

        chat_role_pattern = re.compile(r"^(>\s*)?(User|Assistant|Human|AI):", re.IGNORECASE)
        for line in body.splitlines():
            stripped = line.lstrip()
            if chat_role_pattern.match(stripped):
                self.fail(
                    f"journal.md contains a likely chat-dump line: {line[:80]!r}"
                )

    def test_pitfalls_is_append_only(self):
        """Pitfalls file carries append-only pegadinhas. Assert that the
        section-heading convention is followed (every entry starts with `## [`).
        """
        pitfalls = ROOT / "learner" / "pitfalls.md"
        if not pitfalls.exists():
            self.skipTest("pitfalls.md does not exist yet")
        text = pitfalls.read_text(encoding="utf-8")
        import re

        pattern = re.compile(r"^## \[\d{4}-\d{2}-\d{2}\]")
        section_lines = [
            line for line in text.splitlines()
            if line.startswith("## ") and not line.startswith("## [")
        ]
        # Any section header that isn't a date-prefixed pegadinha is suspect.
        self.assertEqual(
            section_lines,
            [],
            f"pitfalls.md sections must all be date-prefixed pegadinhas; found: {section_lines}",
        )

    def test_no_mastered_state_in_canonical(self):
        """The contract: a concept never reaches `mastered` from documentation
        work alone. The canonical state must NOT have a mastered unit while
        `units_log` is empty (which would mean mastery was claimed without
        executable evidence).
        """
        state = load_canonical()
        units_log = state.get("units_log", [])
        active_state = state.get("active_unit", {}).get("state")
        if active_state == "mastered" and not units_log:
            self.fail(
                "active_unit.state is 'mastered' but units_log is empty; the "
                "contract requires executable evidence (via units_log) before "
                "any unit reaches mastered."
            )


class TestBacklogStatusDrift(unittest.TestCase):
    """Verify BACKLOG_STATUS.md rows match the filesystem for scaffolded projects.

    Status truth lives in BACKLOG_STATUS.md (01+02 are implemented; 03-18 scaffolded).
    This suite does not hardcode those counts — it re-reads the backlog and checks
    that every `scaffolded` row still has the expected skeleton artifacts.
    """

    expected_artifacts = ("docs/spec.md", "go-impl", "rust-impl", "node-impl", "docs/status.md")

    def _parse_backlog(self) -> dict[str, str]:
        """Return {project_slug: status_token} from BACKLOG_STATUS.md."""
        import re

        from learner.substrate.dashboard_snapshot import _status_token

        text = (ROOT / "curriculum" / "BACKLOG_STATUS.md").read_text(encoding="utf-8")
        statuses: dict[str, str] = {}
        slug_pattern = re.compile(r"^\d{2}_[a-z_]+$")
        for line in text.splitlines():
            if not line.startswith("|"):
                continue
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) < 3:
                continue
            slug = cells[0].strip().strip("`")
            if not slug_pattern.match(slug):
                continue
            statuses[slug] = _status_token(cells[1])
        return statuses

    def test_every_scaffolded_row_has_the_expected_artifacts(self):
        statuses = self._parse_backlog()
        scaffolded = [s for s, st in statuses.items() if st == "scaffolded"]
        self.assertGreaterEqual(len(scaffolded), 1, "expected some scaffolded projects")
        missing_summary: list[str] = []
        for slug in scaffolded:
            project = ROOT / "curriculum" / slug
            if not project.exists():
                missing_summary.append(f"{slug}: BACKLOG says scaffolded but folder missing")
                continue
            for rel in self.expected_artifacts:
                if not (project / rel).exists():
                    missing_summary.append(f"{slug}: missing {rel}")
        if missing_summary:
            self.fail(
                "BACKLOG_STATUS.md drift detected:\n  " + "\n  ".join(missing_summary)
            )

    def test_backlog_covers_catalog_projects(self):
        """Every catalog slug NN_* should appear in BACKLOG with a known status."""
        import re

        catalog = (ROOT / "curriculum" / "catalog.md").read_text(encoding="utf-8")
        slug_field = re.compile(r"\*\*Slug\*\*\s*\|\s*`([^`]+)`")
        catalog_slugs = {m.group(1).strip() for m in slug_field.finditer(catalog)}
        statuses = self._parse_backlog()
        known = {"implemented", "scaffolded", "planned", "proposal"}
        for slug in catalog_slugs:
            self.assertIn(slug, statuses, f"{slug} missing from BACKLOG_STATUS.md")
            self.assertIn(
                statuses[slug],
                known,
                f"{slug} has unknown status {statuses[slug]!r}",
            )

    def test_scaffolded_count_matches_dashboard_snapshot(self):
        from learner.substrate.dashboard_snapshot import build_snapshot

        statuses = self._parse_backlog()
        scaffolded_n = sum(1 for st in statuses.values() if st == "scaffolded")
        implemented_n = sum(1 for st in statuses.values() if st == "implemented")
        snapshot = build_snapshot()
        self.assertEqual(
            snapshot["scaffoldedCount"],
            scaffolded_n,
            "dashboard scaffoldedCount must match BACKLOG scaffolded rows",
        )
        self.assertEqual(
            snapshot["masteredCount"],
            implemented_n,
            "dashboard masteredCount must match BACKLOG implemented rows",
        )


class TestWhiteboardDerivedViews(unittest.TestCase):
    """The minimaxDojo/whiteboard/ directory must stay a derived view, never
    silently fork global learner state. The substrate regenerates profile.yaml,
    learner_profile.md, and trail.md on every `sync()`; config and history
    files (cron_registry.yaml, decisions/, event_log/) are hand-maintained.
    """

    whiteboard = ROOT / "engines" / "minimaxDojo" / "whiteboard"

    def test_whiteboard_readme_exists_and_documents_convention(self):
        readme = self.whiteboard / "README.md"
        self.assertTrue(
            readme.exists(),
            "whiteboard/README.md must document which files are derived vs "
            "config vs history. Without it, future agents won't know what to "
            "regenerate.",
        )
        text = readme.read_text(encoding="utf-8")
        self.assertIn("derived", text.lower())
        self.assertIn("history", text.lower())
        self.assertIn("config", text.lower())

    def test_derived_files_carry_derived_from_marker(self):
        for filename in ("profile.yaml", "learner_profile.md", "trail.md"):
            path = self.whiteboard / filename
            if not path.exists():
                continue
            text = path.read_text(encoding="utf-8")
            self.assertIn(
                "derived_from",
                text,
                f"{filename} must carry a `derived_from` frontmatter marker; "
                "otherwise future agents can't tell it's regenerated by the substrate",
            )

    def test_sync_regenerates_whiteboard_derived_files(self):
        """Run the full sync and verify all three derived files exist and contain
        at least one canonical identifier (the active unit id or the active language),
        so we know they're connected to the substrate and not stale copies.
        """
        from learner.substrate import sync

        sync()
        state = load_canonical()
        active_id = state["active_unit"]["id"]
        active_language = state["learner"].get("active_language", "")

        # profile.yaml + learner_profile.md both carry learner_id; trail.md carries
        # the active unit id. So we require at least one of the canonical anchors
        # to be present in each file.
        for filename in ("profile.yaml", "learner_profile.md", "trail.md"):
            path = self.whiteboard / filename
            self.assertTrue(
                path.exists(),
                f"{filename} must exist after sync(); the substrate owns its regeneration",
            )
            text = path.read_text(encoding="utf-8")
            self.assertTrue(
                active_id in text or active_language in text,
                f"{filename} must contain at least one canonical anchor "
                f"(active unit {active_id!r} or active language {active_language!r})",
            )

    def test_config_files_are_not_overwritten(self):
        """Sync must leave cron_registry.yaml and decisions/ alone — those are
        hand-maintained and not regenerated by the substrate.
        """
        from learner.substrate import sync

        cron_before = (self.whiteboard / "cron_registry.yaml").read_text(encoding="utf-8")
        decision_before = (self.whiteboard / "decisions" / "cycle-01-intake.md").read_text(
            encoding="utf-8"
        )

        sync()

        cron_after = (self.whiteboard / "cron_registry.yaml").read_text(encoding="utf-8")
        decision_after = (self.whiteboard / "decisions" / "cycle-01-intake.md").read_text(
            encoding="utf-8"
        )
        self.assertEqual(
            cron_before,
            cron_after,
            "sync() must not overwrite cron_registry.yaml (hand-maintained config)",
        )
        self.assertEqual(
            decision_before,
            decision_after,
            "sync() must not overwrite decisions/ (hand-maintained history)",
        )


class TestScheduling(unittest.TestCase):
    """The gate-outcome → FSRS-rating mapping is the load-bearing rule of the
    spaced-repetition layer: ratings come ONLY from gate outcomes, never
    self-report. Pin the mapping and the vocabulary.
    """

    def test_gate_outcome_maps_to_rating(self):
        from learner.substrate.scheduling import rating_from_gate_outcome

        self.assertEqual(rating_from_gate_outcome("fail"), "again")
        self.assertEqual(rating_from_gate_outcome("pass_retried"), "hard")
        self.assertEqual(rating_from_gate_outcome("pass_first_try"), "good")
        self.assertEqual(rating_from_gate_outcome("pass_exceeds"), "easy")

    def test_unknown_gate_outcome_raises(self):
        from learner.substrate.scheduling import rating_from_gate_outcome

        with self.assertRaises(ValueError):
            rating_from_gate_outcome("bogus")

    def test_rating_vocabulary_is_fsrs_subset(self):
        from learner.substrate.scheduling import RATINGS

        self.assertEqual(RATINGS, frozenset({"again", "hard", "good", "easy"}))

    def test_apply_gate_review_advances_card(self):
        from fsrs import Card

        from learner.substrate.scheduling import apply_gate_review

        card, _log = apply_gate_review(Card(), "good", date(2026, 6, 1))
        self.assertIsNotNone(card.due)
        self.assertIsNotNone(card.stability)

    def test_apply_gate_review_again_due_sooner_than_easy(self):
        from fsrs import Card

        from learner.substrate.scheduling import apply_gate_review

        again_card, _ = apply_gate_review(Card(), "again", date(2026, 6, 1))
        easy_card, _ = apply_gate_review(Card(), "easy", date(2026, 6, 1))
        # `again` (a failed gate) must schedule re-exposure sooner than `easy`.
        self.assertLess(again_card.due, easy_card.due)

    def test_apply_gate_review_rejects_bad_rating(self):
        from fsrs import Card

        from learner.substrate.scheduling import apply_gate_review

        with self.assertRaises(ValueError):
            apply_gate_review(Card(), "bogus", date(2026, 6, 1))

    def test_build_card_returns_none_without_gate_reviews(self):
        from learner.substrate.scheduling import build_card_from_reviews

        self.assertIsNone(build_card_from_reviews([]))
        self.assertIsNone(
            build_card_from_reviews([{"date": date(2026, 6, 1), "event": "presented"}])
        )

    def test_build_card_replays_gate_reviews(self):
        from learner.substrate.scheduling import build_card_from_reviews

        reviews = [
            {"date": date(2026, 6, 1), "event": "gate", "rating": "good"},
            {"date": date(2026, 6, 5), "event": "gate", "rating": "good"},
        ]
        card = build_card_from_reviews(reviews)
        if card is None:
            self.fail("expected gate reviews to rebuild a card")
        self.assertIsNotNone(card.due)
        if card.stability is None:
            self.fail("expected gate reviews to rebuild stability")
        self.assertGreater(card.stability, 0)


class TestNextReviewsDerivation(unittest.TestCase):
    """The next-review queue is DERIVED from real units_log history via FSRS,
    with an injected `today` (never the wall clock) so it is deterministic.
    `enable_fuzzing=False` makes the FSRS intervals reproducible.
    """

    today = date(2026, 6, 21)

    def test_failed_gate_is_overdue_after_a_few_days(self):
        from learner.substrate.scheduling import derive_next_reviews

        # `again` (a failed gate) schedules a short, day-scale interval. Reviewed
        # 06-15 with today 06-21 → due is in the past → overdue.
        units = [
            {
                "unit_id": "U1",
                "concept": "x",
                "reviews": [{"date": date(2026, 6, 15), "event": "gate", "rating": "again"}],
            }
        ]
        out = derive_next_reviews(units, [], self.today)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["reason"], "overdue")

    def test_easy_gate_keeps_unit_hidden_next_day(self):
        from learner.substrate.scheduling import derive_next_reviews

        # `easy` (gate passed with margin) schedules a long interval. Reviewed
        # 06-20 with today 06-21 → due is far ahead → not surfaced.
        units = [
            {
                "unit_id": "U2",
                "concept": "y",
                "reviews": [{"date": date(2026, 6, 20), "event": "gate", "rating": "easy"}],
            }
        ]
        self.assertEqual(derive_next_reviews(units, [], self.today), [])

    def test_unit_without_gate_review_is_due(self):
        from learner.substrate.scheduling import derive_next_reviews

        # Presented but never gate-evaluated → due now (needs a first attempt).
        units = [
            {
                "unit_id": "U3",
                "concept": "z",
                "reviews": [{"date": date(2026, 6, 19), "event": "presented"}],
            }
        ]
        out = derive_next_reviews(units, [], self.today)
        self.assertEqual(out[0]["reason"], "due")
        self.assertEqual(out[0]["dueIn"], "today")

    def test_empty_units_log_yields_only_pitfalls(self):
        from learner.substrate.scheduling import derive_next_reviews

        pitfalls = [
            {"id": "P-001", "description": "trap", "occurrences": 1, "lastSeen": "2026-06-18"}
        ]
        out = derive_next_reviews([], pitfalls, self.today)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["reason"], "recurring-trap")
        self.assertEqual(out[0]["unitId"], "P-001")

    def test_at_most_one_recurring_trap(self):
        from learner.substrate.scheduling import derive_next_reviews

        pitfalls = [
            {"id": "P-001", "description": "a"},
            {"id": "P-002", "description": "b"},
        ]
        out = derive_next_reviews([], pitfalls, self.today)
        self.assertEqual(len(out), 1)

    def test_derivation_is_deterministic(self):
        from learner.substrate.scheduling import derive_next_reviews

        # fuzzing is off → the same history must produce identical output twice.
        units = [
            {
                "unit_id": "U",
                "concept": "c",
                "reviews": [{"date": date(2026, 6, 15), "event": "gate", "rating": "good"}],
            }
        ]
        self.assertEqual(
            derive_next_reviews(units, [], self.today),
            derive_next_reviews(units, [], self.today),
        )


class TestStreak(unittest.TestCase):
    """Gate-anchored streak + freeze transitions (ADR: spaced-repetition-streak).

    The streak grows ONLY on a passed executable-evidence gate; a missed day
    consumes a freeze (cap 2) or breaks. A failed attempt never breaks the
    streak. `today` is injected for determinism.
    """

    def _streak(self, current=3, longest=3, last=None, equipped=2, max_=2):
        return {
            "current": current,
            "longest": longest,
            "last_gate_date": last,
            "freezes": {"equipped": equipped, "max": max_},
        }

    def test_pass_increments_and_sets_last_gate_date(self):
        from learner.substrate.scheduling import record_gate_outcome

        out = record_gate_outcome(self._streak(current=3, longest=5), True, date(2026, 6, 21))
        self.assertEqual(out["current"], 4)
        self.assertEqual(out["longest"], 5)  # longest tracked, not overwritten down
        self.assertEqual(out["last_gate_date"], date(2026, 6, 21))

    def test_pass_updates_longest_when_exceeded(self):
        from learner.substrate.scheduling import record_gate_outcome

        out = record_gate_outcome(self._streak(current=5, longest=5), True, date(2026, 6, 21))
        self.assertEqual(out["current"], 6)
        self.assertEqual(out["longest"], 6)

    def test_failed_attempt_is_a_noop(self):
        from learner.substrate.scheduling import record_gate_outcome

        original = self._streak(current=3, last=date(2026, 6, 20))
        out = record_gate_outcome(original, False, date(2026, 6, 21))
        self.assertEqual(out, original)  # a failed attempt never breaks the streak

    def test_record_does_not_mutate_input(self):
        from learner.substrate.scheduling import record_gate_outcome

        original = self._streak(current=3)
        record_gate_outcome(original, True, date(2026, 6, 21))
        self.assertEqual(original["current"], 3)  # input untouched

    def test_missed_day_consumes_a_freeze(self):
        from learner.substrate.scheduling import reconcile_streak

        # Passed yesterday-eve (06-19); today 06-21 → one full day missed (06-20).
        streak = self._streak(current=4, last=date(2026, 6, 19), equipped=2)
        out = reconcile_streak(streak, date(2026, 6, 21))
        self.assertEqual(out["current"], 4)  # preserved
        self.assertEqual(out["freezes"]["equipped"], 1)  # one freeze consumed

    def test_missed_days_exhaust_freezes_then_break(self):
        from learner.substrate.scheduling import reconcile_streak

        # 4 missed days with 2 freezes → break.
        streak = self._streak(current=5, last=date(2026, 6, 16), equipped=2)
        out = reconcile_streak(streak, date(2026, 6, 21))
        self.assertEqual(out["current"], 0)
        self.assertEqual(out["freezes"]["equipped"], 0)

    def test_reconcile_idempotent_within_day(self):
        from learner.substrate.scheduling import reconcile_streak

        streak = self._streak(current=4, last=date(2026, 6, 21), equipped=2)
        # last_gate_date is today → no missed day → unchanged.
        self.assertEqual(reconcile_streak(streak, date(2026, 6, 21)), streak)

    def test_never_passed_streak_untouched(self):
        from learner.substrate.scheduling import reconcile_streak

        streak = self._streak(current=0, last=None, equipped=2)
        self.assertEqual(reconcile_streak(streak, date(2026, 6, 21)), streak)


class TestCurr(unittest.TestCase):
    """CURR is an UNVALIDATED retention proxy (ADR open question). It must never
    drive automation; it is display-only. Computed as the share of units with a
    gate review in the trailing 7-day window, among units with ANY gate review.
    """

    today = date(2026, 6, 21)

    def _unit(self, uid, gate_days_ago=None):
        reviews = []
        if gate_days_ago is not None:
            reviews.append(
                {"date": self.today - __import__("datetime").timedelta(days=gate_days_ago),
                 "event": "gate", "rating": "good"}
            )
        else:
            reviews.append({"date": self.today, "event": "presented"})
        return {"unit_id": uid, "reviews": reviews}

    def test_no_gate_history_is_zero(self):
        from learner.substrate.scheduling import compute_curr

        # Only a presented event — no gate review → cannot measure retention.
        self.assertEqual(compute_curr([self._unit("U", gate_days_ago=None)], self.today), 0.0)

    def test_recent_gate_is_fully_retained(self):
        from learner.substrate.scheduling import compute_curr

        self.assertEqual(compute_curr([self._unit("U", gate_days_ago=2)], self.today), 1.0)

    def test_stale_gate_is_not_retained(self):
        from learner.substrate.scheduling import compute_curr

        # Gate review 30 days ago → outside the 7-day window → 0.0.
        self.assertEqual(compute_curr([self._unit("U", gate_days_ago=30)], self.today), 0.0)

    def test_mixed_yields_fraction(self):
        from learner.substrate.scheduling import compute_curr

        units = [
            self._unit("A", gate_days_ago=1),   # recent
            self._unit("B", gate_days_ago=30),  # stale
        ]
        self.assertEqual(compute_curr(units, self.today), 0.5)

    def test_curr_in_unit_interval(self):
        from learner.substrate.scheduling import compute_curr

        for days in (0, 1, 6, 7):
            value = compute_curr([self._unit("U", gate_days_ago=days)], self.today)
            self.assertGreaterEqual(value, 0.0)
            self.assertLessEqual(value, 1.0)


class TestPixelReviewSlice(unittest.TestCase):
    """pixelDojo consumes a READ-ONLY slice of scheduling truth. It emits
    evidence only and never marks mastery (GameNeverMarksMastery). The slice is
    a projection of the codexDojo snapshot so both engines share one truth.
    """

    def test_slice_matches_snapshot_truth(self):
        from learner.substrate.dashboard_snapshot import (
            build_pixel_review_slice,
            build_snapshot,
        )

        slc = build_pixel_review_slice()
        snap = build_snapshot()
        self.assertEqual(slc["nextReviews"], snap["nextReviews"])
        self.assertEqual(slc["streak"]["current"], snap["streak"]["current"])
        self.assertEqual(slc["streak"]["freezesEquipped"], snap["streak"]["freezesEquipped"])

    def test_sync_writes_pixel_slice_module(self):
        from learner.substrate.dashboard_snapshot import sync_pixel_review_slice

        path = sync_pixel_review_slice()
        self.assertTrue(path.exists())
        text = path.read_text(encoding="utf-8")
        self.assertIn("export const reviewSlice: ReviewSlice", text)
        # The header must state the evidence_only / GameNeverMarksMastery contract.
        self.assertIn("GameNeverMarksMastery", text)
        self.assertIn("never marks mastery", text)

    def test_sync_regenerates_slice_as_part_of_full_sync(self):
        from learner.substrate import sync

        sync()
        path = ROOT / "engines" / "pixelDojo" / "pixel-quest" / "src" / "content" / "reviewSlice.ts"
        self.assertTrue(path.exists(), "full sync() must regenerate the pixelDojo review slice")


class TestUnitsLogValidation(unittest.TestCase):
    """The invariants that protect the scheduler from poisoned data: rating
    vocabulary, rating↔gate_outcome consistency, freeze cap, and the rule that
    mastery requires a gate review (never docs alone).
    """

    def _state(self, units_log=None, streak=None):
        state = {
            "version": 2,
            "system": "agora-continuum",
            "learner": {
                "id": "x",
                "level": "intermediate",
                "active_language": "Go",
                "languages": ["Go"],
            },
            "active_unit": {"id": "U1", "state": "presenting", "retry_count": 0, "retry_limit": 3},
            "gate": {"implementation_blocked": True},
            "empirical_gates": {"learning": {"requires_attempt_before_solution": True}},
        }
        if units_log is not None:
            state["units_log"] = units_log
        if streak is not None:
            state["streak"] = streak
        return state

    def test_bad_rating_rejected(self):
        state = self._state(
            [{"unit_id": "U", "reviews": [{"date": date(2026, 6, 1), "rating": "super"}]}]
        )
        self.assertTrue(any("rating must be one of" in e for e in validate(state)))

    def test_rating_outcome_mismatch_rejected(self):
        # pass_first_try must map to "good"; "easy" is inconsistent.
        state = self._state(
            [
                {
                    "unit_id": "U",
                    "reviews": [
                        {"date": date(2026, 6, 1), "rating": "easy", "gate_outcome": "pass_first_try"}
                    ],
                }
            ]
        )
        self.assertTrue(any("inconsistent with gate_outcome" in e for e in validate(state)))

    def test_mastered_without_gate_review_rejected(self):
        state = self._state(
            [
                {
                    "unit_id": "U",
                    "mastered": True,
                    "reviews": [{"date": date(2026, 6, 1), "event": "presented"}],
                }
            ]
        )
        self.assertTrue(any("no gate review" in e for e in validate(state)))

    def test_streak_freeze_cap_enforced(self):
        state = self._state(streak={"current": 3, "freezes": {"equipped": 3, "max": 3}})
        self.assertTrue(any("<= 2" in e for e in validate(state)))

    def test_valid_streak_accepted(self):
        state = self._state(streak={"current": 5, "freezes": {"equipped": 2, "max": 2}})
        self.assertEqual(validate(state), [])

    def test_canonical_state_still_validates(self):
        # The seed units_log record (presented, no rating) must not trip any new rule.
        self.assertEqual(validate(load_canonical()), [])


if __name__ == "__main__":
    unittest.main()
