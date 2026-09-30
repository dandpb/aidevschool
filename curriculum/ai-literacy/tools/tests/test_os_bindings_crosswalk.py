from __future__ import annotations

import unittest
from collections import Counter
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[4]
BINDINGS_PATH = (
    REPO_ROOT
    / "engines"
    / "codexdojo-os-prototype"
    / "config"
    / "mission-bindings.yaml"
)
CATALOG_PATH = REPO_ROOT / "curriculum" / "ai-literacy" / "catalog.yaml"

LESSON_KIND = "ai-literacy-lesson"
VOXEL_KIND = "project-voxel-game"
JOURNEY_TRACKS = {"ia_pratica": "ai-pratica", "dev": "dev"}


def _load_yaml(path: Path):
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)


class OsBindingsCrosswalkAuditTest(unittest.TestCase):
    """AID-3457: pins do contrato live entre catálogo canônico e mission-bindings.

    Audita os arquivos reais (não fixtures) para garantir zero regressão nas
    lições live: a premissa corrigida no thread (39 bindings = 23 ai-pratica +
    16 dev, l25-l32 já vinculados, l27-l29 dev) fica travada mecanicamente.
    Qualquer adição/remoção de binding deve atualizar estes pins conscientemente.
    """

    @classmethod
    def setUpClass(cls):
        cls.bindings_doc = _load_yaml(BINDINGS_PATH)
        cls.catalog = _load_yaml(CATALOG_PATH)
        cls.tracks = {t["trackId"]: t for t in cls.bindings_doc["tracks"]}
        cls.bindings = cls.bindings_doc["bindings"]
        cls.module_journeys = {m["id"]: m["journey"] for m in cls.catalog["modules"]}
        cls.lesson_entries = {
            entry["id"]: entry for entry in cls.catalog["lessons"]
        }

    def test_binding_counts_pinned(self):
        counts = Counter(b["trackId"] for b in self.bindings)
        self.assertEqual(len(self.bindings), 39)
        self.assertEqual(
            dict(counts), {"ai-pratica": 23, "dev": 16}
        )

    def test_every_ready_lesson_bound_exactly_once(self):
        lesson_bindings = [
            b
            for b in self.bindings
            if b["curriculum"]["kind"] == LESSON_KIND
        ]
        self.assertEqual(len(lesson_bindings), 32)
        bound_ids = [b["missionId"] for b in lesson_bindings]
        self.assertEqual(sorted(bound_ids), sorted(self.lesson_entries))
        self.assertEqual(len(bound_ids), len(set(bound_ids)))
        for binding in lesson_bindings:
            self.assertEqual(
                binding["curriculum"]["lessonId"], binding["missionId"]
            )
            self.assertEqual(
                binding["curriculum"]["unitId"],
                "ai-literacy:{}".format(binding["missionId"]),
            )

    def test_binding_track_matches_module_journey(self):
        for binding in self.bindings:
            if binding["curriculum"]["kind"] != LESSON_KIND:
                continue
            entry = self.lesson_entries[binding["curriculum"]["lessonId"]]
            journey = self.module_journeys[entry["moduleId"]]
            self.assertEqual(
                binding["trackId"],
                JOURNEY_TRACKS[journey],
                "lesson {} lives in module {} (journey {})".format(
                    binding["missionId"], entry["moduleId"], journey
                ),
            )

    def test_dev_lesson_bindings_are_exactly_the_dev_module_lessons(self):
        dev_lessons = {
            entry["id"]
            for entry in self.catalog["lessons"]
            if self.module_journeys[entry["moduleId"]] == "dev"
        }
        self.assertEqual(
            {
                b["missionId"]
                for b in self.bindings
                if b["curriculum"]["kind"] == LESSON_KIND
                and b["trackId"] == "dev"
            },
            dev_lessons,
        )

    def test_lesson_evidence_contract_is_uniform(self):
        for binding in self.bindings:
            if binding["curriculum"]["kind"] != LESSON_KIND:
                continue
            label = binding["missionId"]
            self.assertEqual(binding["runtime"]["engineId"], "literacyDojo", label)
            self.assertEqual(binding["evidence"]["schema"], "literacy-evidence", label)
            self.assertEqual(binding["evidence"]["version"], 1, label)
            self.assertIs(binding["evidence"]["verifierRequired"], True, label)

    def test_ai_pratica_content_versions_match_canonical_catalog(self):
        canonical = self.catalog["contentVersion"]
        self.assertEqual(self.tracks["ai-pratica"]["contentVersion"], canonical)
        self.assertEqual(self.tracks["dev"]["contentVersion"], canonical)
        for binding in self.bindings:
            if binding["curriculum"]["kind"] != LESSON_KIND:
                continue
            self.assertEqual(
                binding["runtime"]["contentVersion"],
                canonical,
                binding["missionId"],
            )

    def test_voxel_game_bindings_are_optional_dev_practice(self):
        voxel = [
            b for b in self.bindings if b["curriculum"]["kind"] == VOXEL_KIND
        ]
        self.assertEqual(len(voxel), 7)
        for binding in voxel:
            self.assertEqual(binding["trackId"], "dev", binding["missionId"])
            self.assertEqual(
                binding["evidence"]["schema"], "teaching-game-evidence"
            )
            self.assertIs(binding["evidence"]["verifierRequired"], True)


if __name__ == "__main__":
    unittest.main()
