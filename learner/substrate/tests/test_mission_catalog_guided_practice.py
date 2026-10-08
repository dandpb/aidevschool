from __future__ import annotations

import hashlib
import shutil
import tempfile
import unittest
from pathlib import Path
from typing import Any, Callable

from learner.substrate.mission_catalog import MissionCatalogError, load_mission_catalog
from learner.substrate.mission_catalog_guided_practice import (
    GUIDED_PRACTICE_LEARNER_FILES,
    load_guided_practice_catalog,
)
from learner.substrate.tests.mission_catalog_fixture import MissionCatalogFixture


def _guided_binding(fixture: MissionCatalogFixture) -> dict[str, Any]:
    return fixture.bindings["bindings"][-1]


def _recompute_content_version(fixture: MissionCatalogFixture) -> str:
    package_root = (
        fixture.root / "curriculum" / "sequencia-dev-guiada" / "pg-d01-debug-reproduza"
    )
    entries = [
        (
            f"curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza/{relative}",
            hashlib.sha256(
                (package_root / relative).read_text(encoding="utf-8").encode("utf-8")
            ).hexdigest(),
        )
        for relative in GUIDED_PRACTICE_LEARNER_FILES
    ]
    digest = hashlib.sha256(
        "\n".join(f"{path}:{sha}" for path, sha in entries).encode("utf-8")
    ).hexdigest()
    return f"pg-d01@{digest[:12]}"


class TestMissionCatalogGuidedPractice(unittest.TestCase):
    def test_projects_guided_practice_mission_from_canonical_package(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.add_guided_practice()

            snapshot = load_mission_catalog(fixture.root)

        mission = next(
            item for item in snapshot["missions"] if item["id"] == "pg-d01"
        )
        self.assertEqual(mission["trackId"], "dev")
        self.assertEqual(mission["projectId"], "10_sequencia_dev_guiada")
        self.assertEqual(mission["unitId"], "sequencia-dev-guiada:pg-d01")
        self.assertEqual(
            mission["title"],
            "Prática guiada sintética: reproduza antes de perguntar",
        )
        self.assertEqual(
            mission["objective"],
            "Executar o ciclo guiado sintético com evidência local por passo.",
        )
        self.assertEqual(mission["estimatedMinutes"], 40)
        self.assertEqual(mission["chapterOrder"], 11)
        self.assertEqual(mission["prerequisites"], ["l17"])
        self.assertEqual(mission["runtime"]["engineId"], "codexdojo-os")
        self.assertEqual(mission["runtime"]["appId"], "practice")
        self.assertNotIn("entrypoint", mission["runtime"])
        self.assertNotIn("environmentKey", mission["runtime"])
        self.assertEqual(mission["evidence"]["schema"], "guided-practice-evidence")
        self.assertEqual(mission["evidence"]["version"], 1)
        self.assertEqual(mission["evidence"]["verifierRequired"], True)

    def test_content_version_pins_canonical_package_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.add_guided_practice()

            mission = next(
                item
                for item in load_mission_catalog(fixture.root)["missions"]
                if item["id"] == "pg-d01"
            )
            self.assertEqual(
                mission["runtime"]["contentVersion"],
                _recompute_content_version(fixture),
            )

            grader_only = (
                fixture.root
                / "curriculum"
                / "sequencia-dev-guiada"
                / "pg-d01-debug-reproduza"
                / "guia-de-correcao"
                / "solucao.md"
            )
            grader_only.parent.mkdir(parents=True)
            grader_only.write_text("SOLUCAO SECRETA", encoding="utf-8")
            next(
                item
                for item in load_mission_catalog(fixture.root)["missions"]
                if item["id"] == "pg-d01"
            )

            learner_file = (
                fixture.root
                / "curriculum"
                / "sequencia-dev-guiada"
                / "pg-d01-debug-reproduza"
                / "insumos"
                / "REGRA.md"
            )
            learner_file.write_text("# Regra alterada\n", encoding="utf-8")
            with self.assertRaisesRegex(
                MissionCatalogError,
                "contentVersion must match the canonical guided-practice package",
            ):
                load_mission_catalog(fixture.root)

    def test_rejects_incoherent_guided_bindings(self) -> None:
        def with_literacy_runtime(binding: dict[str, Any]) -> None:
            binding["runtime"] = {
                "engineId": "literacyDojo",
                "entrypoint": "http://127.0.0.1:5178/?hosted=1",
                "environmentKey": "VITE_LITERACYDOJO_URL",
                "protocolVersion": "1.0",
                "contentVersion": binding["runtime"]["contentVersion"],
            }

        cases: list[tuple[str, Callable[[dict[str, Any]], None]]] = [
            (
                "must use the dev track",
                lambda binding: binding.update({"trackId": "ai-pratica"}),
            ),
            (
                "must use the dev track",
                with_literacy_runtime,
            ),
            (
                "must preserve guided practice id",
                lambda binding: binding.update({"missionId": "pg-d99"}),
            ),
            (
                "must be sequencia-dev-guiada:pg-d01",
                lambda binding: binding["curriculum"].update(
                    {"unitId": "U10-guided"}
                ),
            ),
            (
                "references unknown guided practice",
                lambda binding: binding["curriculum"].update(
                    {"practiceId": "pg-d99"}
                ),
            ),
            (
                "must include the canonical anchor lesson",
                lambda binding: binding.update({"prerequisites": ["l16"]}),
            ),
            (
                "must use guided-practice-evidence",
                lambda binding: binding["evidence"].update(
                    {"schema": "literacy-evidence"}
                ),
            ),
            (
                "version must be a positive integer",
                lambda binding: binding.pop("version"),
            ),
            (
                "appId 'games' is unsupported",
                lambda binding: binding["runtime"].update({"appId": "games"}),
            ),
            (
                "appId must be a non-empty string",
                lambda binding: binding["runtime"].pop("appId"),
            ),
            (
                "entrypoint must not be declared",
                lambda binding: binding["runtime"].update(
                    {"entrypoint": "http://127.0.0.1:5178/?hosted=1"}
                ),
            ),
            (
                "environmentKey must not be declared",
                lambda binding: binding["runtime"].update(
                    {"environmentKey": "VITE_PRACTICE_URL"}
                ),
            ),
        ]
        for expected, mutate in cases:
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as tmp:
                fixture = MissionCatalogFixture(Path(tmp))
                fixture.add_guided_practice()
                mutate(_guided_binding(fixture))
                fixture.write()
                with self.assertRaisesRegex(MissionCatalogError, expected):
                    load_mission_catalog(fixture.root)

    def test_rejects_malformed_packages(self) -> None:
        def drop_rubric_rows(fixture: MissionCatalogFixture) -> None:
            rubrica = (
                fixture.root
                / "curriculum"
                / "sequencia-dev-guiada"
                / "pg-d01-debug-reproduza"
                / "rubrica-v1.md"
            )
            rubrica.write_text("# pg-d01 — Rúbrica sem critérios\n", encoding="utf-8")

        def rename_package_dir(fixture: MissionCatalogFixture) -> None:
            package = (
                fixture.root / "curriculum" / "sequencia-dev-guiada" / "pg-d01-debug-reproduza"
            )
            package.rename(package.with_name("outra-pratica"))

        def break_identity_heading(fixture: MissionCatalogFixture) -> None:
            enunciado = (
                fixture.root
                / "curriculum"
                / "sequencia-dev-guiada"
                / "pg-d01-debug-reproduza"
                / "enunciado.md"
            )
            enunciado.write_text(
                enunciado.read_text(encoding="utf-8").replace(
                    "# pg-d01 — ", "# pg-d01: "
                ),
                encoding="utf-8",
            )

        def break_track_marker(fixture: MissionCatalogFixture) -> None:
            enunciado = (
                fixture.root
                / "curriculum"
                / "sequencia-dev-guiada"
                / "pg-d01-debug-reproduza"
                / "enunciado.md"
            )
            enunciado.write_text(
                enunciado.read_text(encoding="utf-8").replace(
                    "**Trilha:** Dev", "**Trilha:** Uso"
                ),
                encoding="utf-8",
            )

        def drop_learner_file(fixture: MissionCatalogFixture) -> None:
            (
                fixture.root
                / "curriculum"
                / "sequencia-dev-guiada"
                / "pg-d01-debug-reproduza"
                / "insumos"
                / "bugreport.md"
            ).unlink()

        def duplicate_practice_id(fixture: MissionCatalogFixture) -> None:
            package = (
                fixture.root / "curriculum" / "sequencia-dev-guiada" / "pg-d01-debug-reproduza"
            )
            clone = package.with_name("pg-d01-clone")
            clone.mkdir()
            for relative in GUIDED_PRACTICE_LEARNER_FILES:
                target = clone / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(
                    (package / relative).read_text(encoding="utf-8"), encoding="utf-8"
                )

        cases: list[tuple[str, Callable[[MissionCatalogFixture], None], str]] = [
            ("no rubric criteria", drop_rubric_rows, "no rubric criteria"),
            (
                "directory must start with practice id",
                rename_package_dir,
                "must start with practice id",
            ),
            (
                "no identity heading",
                break_identity_heading,
                "heading",
            ),
            ("wrong track marker", break_track_marker, "Trilha: Dev"),
            (
                "missing learner-facing file",
                drop_learner_file,
                "learner-facing file",
            ),
            (
                "duplicate practice id",
                duplicate_practice_id,
                "duplicate guided practice",
            ),
        ]
        for expected, mutate, message in cases:
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as tmp:
                fixture = MissionCatalogFixture(Path(tmp))
                fixture.add_guided_practice()
                mutate(fixture)
                with self.assertRaisesRegex(MissionCatalogError, message):
                    load_mission_catalog(fixture.root)

    def test_absent_guided_practice_root_yields_empty_catalog(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.add_guided_practice()
            snapshot = load_mission_catalog(fixture.root)
            next(item for item in snapshot["missions"] if item["id"] == "pg-d01")

        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.add_guided_practice()
            shutil.rmtree(fixture.root / "curriculum" / "sequencia-dev-guiada")
            _guided_binding(fixture)["runtime"]["contentVersion"] = "pg-d01@deadbeefcafe"
            fixture.write()
            with self.assertRaisesRegex(
                MissionCatalogError, "references unknown guided practice"
            ):
                load_mission_catalog(fixture.root)

        self.assertEqual(
            load_guided_practice_catalog(Path("/nonexistent/sequencia-dev-guiada")), {}
        )


if __name__ == "__main__":
    unittest.main()
