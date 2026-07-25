from __future__ import annotations

import copy
import tempfile
import unittest
from pathlib import Path

import yaml

from learner.substrate.mission_catalog import MissionCatalogError, load_mission_catalog
from learner.substrate.ts_render import render_mission_catalog_ts


def _project_catalog() -> str:
    return """# Curriculum

## Level 0

### 00. AI in Practice

| Field | Value |
|-------|-------|
| **Slug** | `00_ai_in_practice` |
| **Status** | scaffolded |
| **Concepts** | AI literacy |
| **Key question** | Can the learner verify an AI answer? |
| **Learning goal** | Verify before use. |
| **Directory** | `00_ai_in_practice/` |
| **Dependencies** | None |
"""


def _catalog() -> dict:
    return {
        "schemaVersion": 1,
        "contentVersion": "test.1",
        "track": {"id": "ai-literacy"},
        "lessons": [
            {
                "id": "l02",
                "title": "Truth needs verification",
                "objective": "Recognize an unsupported claim.",
                "estimatedMinutes": 4,
                "prerequisites": [],
                "status": "ready",
            },
            {
                "id": "l03",
                "title": "Know the limits",
                "objective": "Distinguish suitable tasks.",
                "estimatedMinutes": 4,
                "prerequisites": ["l02"],
                "status": "ready",
            },
        ],
    }


def _lesson(lesson_id: str, version: int) -> dict:
    return {
        "id": lesson_id,
        "version": version,
        "evidence": {"verifierRequired": True},
    }


def _binding(lesson_id: str) -> dict:
    return {
        "missionId": lesson_id,
        "trackId": "ai-pratica",
        "curriculum": {
            "kind": "ai-literacy-lesson",
            "lessonId": lesson_id,
            "projectId": "00_ai_in_practice",
            "unitId": f"ai-literacy:{lesson_id}",
        },
        "runtime": {
            "engineId": "literacyDojo",
            "entrypoint": "http://127.0.0.1:5178/?hosted=1",
            "environmentKey": "VITE_LITERACYDOJO_URL",
            "protocolVersion": "1.0",
        },
        "evidence": {
            "schema": "literacy-evidence",
            "version": 1,
            "verifierRequired": True,
        },
        "fallback": {"kind": "dom", "summary": "Semantic lesson controls."},
    }


class MissionCatalogFixture:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.catalog = _catalog()
        self.bindings = {"schemaVersion": 1, "bindings": [_binding("l02")]}
        (root / "curriculum" / "ai-literacy" / "modules" / "mod-01").mkdir(parents=True)
        (root / "engines" / "codexdojo-os-prototype" / "config").mkdir(parents=True)
        (root / "curriculum" / "catalog.md").write_text(_project_catalog(), encoding="utf-8")
        self.write()

    def write(self) -> None:
        literacy = self.root / "curriculum" / "ai-literacy"
        (literacy / "catalog.yaml").write_text(
            yaml.safe_dump(self.catalog, sort_keys=False), encoding="utf-8"
        )
        for lesson_id, version in (("l02", 3), ("l03", 1)):
            (literacy / "modules" / "mod-01" / f"{lesson_id}.yaml").write_text(
                yaml.safe_dump(_lesson(lesson_id, version), sort_keys=False), encoding="utf-8"
            )
        (self.root / "engines" / "codexdojo-os-prototype" / "config" / "mission-bindings.yaml").write_text(
            yaml.safe_dump(self.bindings, sort_keys=False), encoding="utf-8"
        )


class TestMissionCatalog(unittest.TestCase):
    def test_joins_ready_curriculum_identity_with_runtime_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))

            snapshot = load_mission_catalog(fixture.root)

        self.assertEqual(snapshot["schemaVersion"], 1)
        self.assertEqual(snapshot["contentVersion"], "test.1")
        mission = snapshot["missions"][0]
        self.assertEqual(mission["id"], "l02")
        self.assertEqual(mission["version"], 3)
        self.assertEqual(mission["unitId"], "ai-literacy:l02")
        self.assertEqual(mission["projectId"], "00_ai_in_practice")
        self.assertEqual(mission["runtime"]["engineId"], "literacyDojo")
        self.assertEqual(mission["fallback"]["kind"], "dom")
        self.assertEqual(mission["evidence"]["verifierRequired"], True)

    def test_preserves_prerequisites_as_mission_ids(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"].append(_binding("l03"))
            fixture.write()

            snapshot = load_mission_catalog(fixture.root)

        self.assertEqual(snapshot["missions"][1]["prerequisites"], ["l02"])

    def test_rejects_unknown_non_ready_duplicate_and_unbound_prerequisites(self) -> None:
        cases: list[tuple[str, callable]] = [
            (
                "unknown curriculum lesson",
                lambda fixture: fixture.bindings["bindings"][0]["curriculum"].update(
                    {"lessonId": "l99"}
                ),
            ),
            (
                "non-ready curriculum lesson",
                lambda fixture: fixture.catalog["lessons"][0].update({"status": "planned"}),
            ),
            (
                "duplicate mission id",
                lambda fixture: fixture.bindings["bindings"].append(
                    copy.deepcopy(fixture.bindings["bindings"][0])
                ),
            ),
            (
                "unbound curriculum prerequisites",
                lambda fixture: fixture.bindings.update(
                    {"bindings": [_binding("l03")]}
                ),
            ),
        ]
        for expected, mutate in cases:
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as tmp:
                fixture = MissionCatalogFixture(Path(tmp))
                mutate(fixture)
                fixture.write()
                with self.assertRaisesRegex(MissionCatalogError, expected):
                    load_mission_catalog(fixture.root)

    def test_rejects_missing_fallback_and_unsupported_versions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"][0].pop("fallback")
            fixture.write()
            with self.assertRaisesRegex(MissionCatalogError, "fallback must be a mapping"):
                load_mission_catalog(fixture.root)

        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.bindings["bindings"][0]["runtime"]["protocolVersion"] = "2.0"
            fixture.write()
            with self.assertRaisesRegex(MissionCatalogError, "unsupported"):
                load_mission_catalog(fixture.root)

    def test_typescript_output_is_deterministic_and_has_no_authority_api(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            snapshot = load_mission_catalog(fixture.root)

        first = render_mission_catalog_ts(snapshot)
        second = render_mission_catalog_ts(snapshot)

        self.assertEqual(first, second)
        self.assertIn('id: "l02"', first)
        self.assertIn('verifierRequired: true', first)
        self.assertIn("DO NOT EDIT", first)
        for forbidden in ("markMastered", "masteryAuthority", "saveCanonical", "setState"):
            self.assertNotIn(forbidden, first)


if __name__ == "__main__":
    unittest.main()
