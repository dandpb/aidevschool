from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from typing import Any, Callable

from learner.substrate.mission_catalog import MissionCatalogError, load_mission_catalog
from learner.substrate.mission_catalog_guided_practice import (
    load_guided_practice_catalog,
)
from learner.substrate.tests.mission_catalog_fixture import MissionCatalogFixture


FIXTURE_ROOT = Path(__file__).parent / "fixtures" / "pgd02-frozen-source"
PACKAGE_DIR_NAME = "pg-d02-pedido-estruturado"
CONTRACT_RELPATH = "tools/fixtures/pg-d02-source-contract.json"
# Ratified projection interface (AID-3617 F1, frozen at PR #641 head
# 497fcf67efedd660efc7d51ff2c6a1297edf5bb5): contentVersion follows the
# PR628/PR625 parity contract; the guia-de-correcao hashes never enter the
# learner entries.
RATIFIED_CONTENT_VERSION = "pg-d02@920e17baafd5"
RATIFIED_CRITERIA_IDS = [
    "c1-cinco-campos",
    "c2-contexto-por-caminho",
    "c3-objetivo-unico",
    "c4-aceite-executavel",
    "c5-resticoes-do-contrato",
    "c6-nao-meta-explicita",
    "c7-casos-borda-decidiveis",
]
RATIFIED_ANCHOR_LESSON_ID = "l16"


def _compose_with_pgd02(root: Path) -> None:
    sequencia = root / "curriculum" / "sequencia-dev-guiada"
    shutil.copytree(FIXTURE_ROOT / "package", sequencia / PACKAGE_DIR_NAME)
    shutil.copytree(FIXTURE_ROOT / "tools", sequencia / "tools")


def _contract_path(root: Path) -> Path:
    return root / "curriculum" / "sequencia-dev-guiada" / CONTRACT_RELPATH


def _package_path(root: Path) -> Path:
    return root / "curriculum" / "sequencia-dev-guiada" / PACKAGE_DIR_NAME


def _read_contract(root: Path) -> dict[str, Any]:
    return json.loads(_contract_path(root).read_text(encoding="utf-8"))


def _rewrite_contract(root: Path, mutate: Callable[[dict[str, Any]], None]) -> None:
    contract = _read_contract(root)
    mutate(contract)
    _contract_path(root).write_text(
        json.dumps(contract, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def _independent_content_version(root: Path) -> str:
    """PR628 parity formula over exactly the frozen learner allowlist."""
    allowlist = _read_contract(root)["sourceInterface"]["learnerVisibleFiles"]
    entries = [
        (
            f"curriculum/sequencia-dev-guiada/{PACKAGE_DIR_NAME}/{relative}",
            hashlib.sha256(
                (_package_path(root) / relative).read_text(encoding="utf-8").encode(
                    "utf-8"
                )
            ).hexdigest(),
        )
        for relative in allowlist
    ]
    digest = hashlib.sha256(
        "\n".join(f"{path}:{sha}" for path, sha in entries).encode("utf-8")
    ).hexdigest()
    return f"pg-d02@{digest[:12]}"


class TestMissionCatalogGuidedPracticePgd02(unittest.TestCase):
    def test_composition_loads_pgd02_and_preserves_pgd01_output(self) -> None:
        with tempfile.TemporaryDirectory() as pgd01_only, tempfile.TemporaryDirectory() as composed:
            fixture_a = MissionCatalogFixture(Path(pgd01_only))
            fixture_a.add_guided_practice()
            fixture_b = MissionCatalogFixture(Path(composed))
            fixture_b.add_guided_practice()
            _compose_with_pgd02(fixture_b.root)

            practices_only_pgd01 = load_guided_practice_catalog(
                fixture_a.root / "curriculum" / "sequencia-dev-guiada"
            )
            practices_composed = load_guided_practice_catalog(
                fixture_b.root / "curriculum" / "sequencia-dev-guiada"
            )

        self.assertEqual(practices_only_pgd01.keys(), {"pg-d01"})
        self.assertEqual(practices_composed.keys(), {"pg-d01", "pg-d02"})
        self.assertEqual(practices_composed["pg-d01"], practices_only_pgd01["pg-d01"])

    def test_catalog_generation_survives_composition_with_pgd01_output_intact(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as pgd01_only, tempfile.TemporaryDirectory() as composed:
            fixture_a = MissionCatalogFixture(Path(pgd01_only))
            fixture_a.add_guided_practice()
            fixture_b = MissionCatalogFixture(Path(composed))
            fixture_b.add_guided_practice()
            _compose_with_pgd02(fixture_b.root)

            snapshot_only_pgd01 = load_mission_catalog(fixture_a.root)
            snapshot_composed = load_mission_catalog(fixture_b.root)

        self.assertEqual(
            snapshot_composed["missions"], snapshot_only_pgd01["missions"]
        )
        self.assertNotIn("pg-d02", {mission["id"] for mission in snapshot_composed["missions"]})

    def test_pgd02_record_follows_the_frozen_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.add_guided_practice()
            _compose_with_pgd02(fixture.root)

            record = load_guided_practice_catalog(
                fixture.root / "curriculum" / "sequencia-dev-guiada"
            )["pg-d02"]

        contract = json.loads(
            (FIXTURE_ROOT / CONTRACT_RELPATH).read_text(encoding="utf-8")
        )
        self.assertEqual(record["package_dir"], PACKAGE_DIR_NAME)
        self.assertEqual(
            record["title"],
            "Prática guiada: o pedido estruturado de 5 campos",
        )
        self.assertTrue(record["objective"].startswith("Dado o pedido real"))
        self.assertEqual(record["anchor_lesson_id"], RATIFIED_ANCHOR_LESSON_ID)
        self.assertEqual(
            record["anchor_lesson_id"],
            contract["package"]["anchors"]["prerequisiteLesson"]["id"],
        )
        self.assertEqual(record["track_id"], "dev")
        self.assertEqual(record["estimated_minutes"], 40)
        self.assertEqual(record["target_minutes"], {"min": 25, "max": 40})
        self.assertEqual(record["rubric_criteria"], RATIFIED_CRITERIA_IDS)
        self.assertEqual(record["rubric_criteria"], contract["structure"]["criteriaIds"])
        self.assertEqual(contract["package"]["contentVersion"], RATIFIED_CONTENT_VERSION)

    def test_pgd02_content_version_proves_parity_and_guia_exclusion(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.add_guided_practice()
            _compose_with_pgd02(fixture.root)

            record = load_guided_practice_catalog(
                fixture.root / "curriculum" / "sequencia-dev-guiada"
            )["pg-d02"]
            independent = _independent_content_version(fixture.root)

        self.assertEqual(record["content_version"], RATIFIED_CONTENT_VERSION)
        self.assertEqual(independent, RATIFIED_CONTENT_VERSION)

    def test_recognized_contract_and_source_fail_closed(self) -> None:
        def drift_learner_file(root: Path) -> None:
            target = _package_path(root) / "rubrica-v1.md"
            target.write_text(
                target.read_text(encoding="utf-8") + "\n<!-- drift -->\n",
                encoding="utf-8",
            )

        def drift_provenance_only_file(root: Path) -> None:
            target = _package_path(root) / "guia-de-correcao" / "solucao.md"
            target.write_text("byte drift", encoding="utf-8")

        def drop_pinned_file(root: Path) -> None:
            (_package_path(root) / "insumos" / "meus_commits.json").unlink()

        def tamper_declared_content_version(root: Path) -> None:
            _rewrite_contract(
                root,
                lambda contract: contract["package"].update(
                    {"contentVersion": "pg-d02@55882460a2bf"}
                ),
            )

        def tamper_contract_schema(root: Path) -> None:
            _rewrite_contract(
                root,
                lambda contract: contract.update({"schema": "other@9"}),
            )

        def corrupt_contract_json(root: Path) -> None:
            _contract_path(root).write_text("{not json", encoding="utf-8")

        def tamper_allowlist_agreement(root: Path) -> None:
            _rewrite_contract(
                root,
                lambda contract: contract["sourceInterface"].update(
                    {"learnerVisibleFiles": contract["sourceInterface"][
                        "learnerVisibleFiles"
                    ][:1]}
                ),
            )

        def tamper_declared_practice_id(root: Path) -> None:
            _rewrite_contract(
                root,
                lambda contract: contract["package"].update({"practiceId": "pg-d99"}),
            )

        def tamper_prerequisite_lesson(root: Path) -> None:
            _rewrite_contract(
                root,
                lambda contract: contract["package"]["anchors"].update(
                    {"prerequisiteLesson": {"id": "U03", "unit": "U03"}}
                ),
            )

        cases: list[tuple[str, Callable[[Path], None], str]] = [
            (
                "learner source drift",
                drift_learner_file,
                "source byte change detected",
            ),
            (
                "provenance-only source drift",
                drift_provenance_only_file,
                "source byte change detected",
            ),
            (
                "missing pinned file",
                drop_pinned_file,
                "missing pinned source file",
            ),
            (
                "declared contentVersion divergence",
                tamper_declared_content_version,
                "does not match the parity formula",
            ),
            (
                "unrecognized contract schema",
                tamper_contract_schema,
                "must declare schema",
            ),
            (
                "unreadable contract",
                corrupt_contract_json,
                "unreadable",
            ),
            (
                "allowlist disagreement",
                tamper_allowlist_agreement,
                "allowlist disagreement",
            ),
            (
                "declared practiceId divergence",
                tamper_declared_practice_id,
                "identity heading says",
            ),
            (
                "untraceable prerequisite lesson id",
                tamper_prerequisite_lesson,
                "must be a lesson id",
            ),
        ]
        for expected, mutate, message in cases:
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as tmp:
                fixture = MissionCatalogFixture(Path(tmp))
                fixture.add_guided_practice()
                _compose_with_pgd02(fixture.root)
                mutate(fixture.root)
                with self.assertRaisesRegex(MissionCatalogError, message):
                    load_mission_catalog(fixture.root)

    def test_pgd02_binding_stays_orphan_until_the_source_lands(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fixture = MissionCatalogFixture(Path(tmp))
            fixture.add_guided_practice()
            binding = fixture.bindings["bindings"][-1]
            binding["curriculum"]["practiceId"] = "pg-d02"
            binding["missionId"] = "pg-d02"
            binding["runtime"]["contentVersion"] = RATIFIED_CONTENT_VERSION
            fixture.write()

            with self.assertRaisesRegex(
                MissionCatalogError, "references unknown guided practice"
            ):
                load_mission_catalog(fixture.root)


if __name__ == "__main__":
    unittest.main()
