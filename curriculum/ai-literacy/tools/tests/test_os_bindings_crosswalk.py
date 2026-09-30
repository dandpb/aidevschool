from __future__ import annotations

import re
import sys
import unittest
from collections import Counter
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[4]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from learner.substrate.mission_catalog_bindings import (  # noqa: E402
    validate_tracks,
)
BINDINGS_PATH = (
    REPO_ROOT
    / "engines"
    / "codexdojo-os-prototype"
    / "config"
    / "mission-bindings.yaml"
)
CATALOG_PATH = REPO_ROOT / "curriculum" / "ai-literacy" / "catalog.yaml"
PIXEL_PACK_PATH = (
    REPO_ROOT
    / "engines"
    / "pixelDojo"
    / "pixel-quest"
    / "src"
    / "content"
    / "curriculumPack.ts"
)
LEARNING_STATE_PATH = REPO_ROOT / "learner" / "learning_state.yaml"

LESSON_KIND = "ai-literacy-lesson"
VOXEL_KIND = "project-voxel-game"
JOURNEY_TRACKS = {"ia_pratica": "ai-pratica", "dev": "dev"}

# AID-3457 (complemento 696dc5d3): aliases EXPLÍCITOS do pack Pixel. Equivalência
# Pixel<->Voxel<->substrate nunca se infere por semelhança de nome — só por esta
# tabela (fixture canônica do crosswalk). Atualizar conscientemente se o pack migrar.
PIXEL_UNIT_ALIASES = {
    "01_rate_limiter": "U0-sonda-rate-limiter-robustness",
    "04_concurrent_task_queue": "U4-task-queue",
}
# Defaults de template `U-${project}` NUNCA são identidade canônica (U4 é o caso
# documentado de drift L4: decisão CEO AID-1859 Option A) — os sete pares missão->unit
# do track voxel são pinados inteiros em VOXEL_MISSION_UNITS.


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


class PixelPackUnitAliasAuditTest(unittest.TestCase):
    """AID-3457 (complemento 696dc5d3 + revisão final 499ec177): aliases congelados.

    curriculumPack.ts:666 não segue padrão uniforme (dois aliases explícitos +
    template ``U-${project}``). O teste avalia o MAPEAMENTO COMPLETO emitido por
    projeto: parseia a função ``unitId`` (branches ordenadas + fallback) e a lista
    de módulos do fonte, computa o unit_id de cada projeto e compara com o mapa
    explícito esperado — trocar branches U0/U4, editar strings ou mudar o
    template muda o mapa emitido e falha. Regiões ``lab-<project>`` não são
    unit_ids. Equivalência com nomes Voxel nunca é inferida por semelhança.
    """

    # Mapa canônico voxel (missionId -> unitId); revisão 499ec177: pin dos
    # SETE pares completos, não apenas exclusões — adotar um default de
    # template Pixel (ex. U-02_key_value_store) como id canônico falha aqui.
    VOXEL_MISSION_UNITS = {
        "game-02-warehouse": ("02_key_value_store", "U2-key-value-store"),
        "game-03-wormhole": ("03_url_shortener", "U3-url-shortener"),
        "game-05-relay-station": ("05_websocket_chat", "U5-websocket-chat"),
        "game-06-pipeline-plant": ("06_file_upload_pipeline", "U6-file-upload"),
        "game-07-checkpoint-city": ("07_rest_api_auth", "U7-rest-api-auth"),
        "game-08-timeline-tower": (
            "08_event_driven_order_system",
            "U8-event-driven",
        ),
        "game-09-docking-bay": ("09_plugin_system", "U9-plugin-system"),
    }

    UNIT_ID_BRANCH_RE = (
        r'if \(module\.project === "([^"]+)"\) \{\s*\n\s*return "([^"]+)"\s*\n\s*\}'
    )
    MODULE_PROJECT_RE = re.compile(r'^\s{4}project: "([^"]+)",\s*$', re.MULTILINE)

    @classmethod
    def setUpClass(cls):
        cls.pack_source = PIXEL_PACK_PATH.read_text(encoding="utf-8")
        cls.learning_state = _load_yaml(LEARNING_STATE_PATH)

    @classmethod
    def _emitted_pixel_unit_map(cls):
        """Computa o unit_id emitido por projeto, avaliando o fonte.

        Parseia o corpo da função ``unitId`` e REJEITA qualquer statement não
        consumido (revisão 4d78c138): após remover as branches reconhecidas e o
        return de fallback, o resíduo precisa ser só a assinatura, espaços e a
        chave de fechamento — um ``return`` incondicional extra antes das
        branches, um ``if`` não modelado ou qualquer código não reconhecido
        falha o teste (fail-closed de verdade, não só pin de forma).
        """
        start = cls.pack_source.index("function unitId(")
        end = cls.pack_source.index("\n}", start)
        body = cls.pack_source[start:end]
        branch_matches = list(re.finditer(cls.UNIT_ID_BRANCH_RE, body))
        if not branch_matches:
            raise AssertionError("unitId branches not parseable — structure changed")
        fallback_match = re.search(
            r"return `U-\$\{module\.project\}`", body
        )
        if fallback_match is None:
            raise AssertionError(
                "unitId fallback template changed or not parseable"
            )
        residue = list(body)
        for span_start, span_end in [
            (m.start(), m.end()) for m in branch_matches
        ] + [(fallback_match.start(), fallback_match.end())]:
            residue[span_start:span_end] = ["\x00"] * (span_end - span_start)
        residue_text = "".join(
            " " if ch == "\x00" else ch for ch in residue
        )
        residue_text = residue_text.split("\n", 1)[1] if "\n" in residue_text else ""
        if re.sub(r"[\s{}]", "", residue_text):
            raise AssertionError(
                "unitId body contains unrecognized statements — parser is "
                "fail-closed, update the test consciously: "
                + repr(residue_text.strip()[:120])
            )
        branches = [m.groups() for m in branch_matches]
        projects = cls.MODULE_PROJECT_RE.findall(cls.pack_source)
        if len(set(projects)) != len(projects) or not projects:
            raise AssertionError("pixel pack module list not parseable")
        emitted = {}
        for project in projects:
            for branch_project, alias in branches:
                if project == branch_project:
                    emitted[project] = alias
                    break
            else:
                emitted[project] = "U-{}".format(project)
        return emitted

    def test_pixel_pack_emits_the_complete_unit_id_map(self):
        emitted = self._emitted_pixel_unit_map()
        expected = {
            project: ("U-{}".format(project))
            for project in emitted
        }
        expected.update(PIXEL_UNIT_ALIASES)
        self.assertEqual(
            emitted,
            expected,
            "pixel pack unitId mapping drifted from the frozen aliases/template",
        )

    def test_u0_alias_is_persisted_by_the_substrate(self):
        units_log = self.learning_state.get("units_log") or []
        unit_ids = {entry.get("unit_id") for entry in units_log}
        self.assertIn(
            PIXEL_UNIT_ALIASES["01_rate_limiter"], unit_ids
        )

    def test_voxel_bindings_pin_all_seven_mission_unit_pairs(self):
        bindings_doc = _load_yaml(BINDINGS_PATH)
        actual = {
            b["missionId"]: (
                b["curriculum"]["projectId"],
                b["curriculum"]["unitId"],
            )
            for b in bindings_doc["bindings"]
            if b["curriculum"]["kind"] == VOXEL_KIND
        }
        self.assertEqual(actual, self.VOXEL_MISSION_UNITS)

    def test_no_unit_id_is_region_shaped(self):
        bindings_doc = _load_yaml(BINDINGS_PATH)
        for binding in bindings_doc["bindings"]:
            unit_id = binding["curriculum"]["unitId"]
            self.assertFalse(
                ":lab" in unit_id or unit_id.startswith("lab-"),
                "{} looks like a Pixel region id, not a unit id".format(unit_id),
            )


class RuntimeVersionEnforcementAuditTest(unittest.TestCase):
    """AID-3457 (revisão PR #611): distingue proteção runtime de proteção de teste.

    O runtime hoje só exige igualdade contentVersion<->catálogo no track
    ``ai-pratica`` (mission_catalog_bindings.py:45); o track ``dev`` aceita
    qualquer string não-vazia. A igualdade Dev vigente é garantida pelo pin
    ``test_ai_pratica_content_versions_match_canonical_catalog`` (CI), não pelo
    runtime. Este pin negativo documenta o gap: se a proteção virar runtime,
    flipar conscientemente junto com o change conjunta do substrate.
    """

    DEV_DIVERGENT_TRACKS = [
        {
            "trackId": "ai-pratica",
            "contentVersion": "2049-01-01",
            "recommendedEntryMissionId": "l01",
        },
        {
            "trackId": "dev",
            "contentVersion": "1999-01-01-divergent",
            "recommendedEntryMissionId": "l27",
        },
    ]

    def test_runtime_rejects_divergent_ai_pratica_track(self):
        tracks = [
            track
            for track in self.DEV_DIVERGENT_TRACKS
            if track["trackId"] == "dev"
        ] + [
            {
                "trackId": "ai-pratica",
                "contentVersion": "1999-01-01-divergent",
                "recommendedEntryMissionId": "l01",
            }
        ]
        with self.assertRaises(Exception):
            validate_tracks(tracks, literacy_content_version="2049-01-01")

    def test_runtime_accepts_divergent_dev_track_today(self):
        validated = validate_tracks(
            self.DEV_DIVERGENT_TRACKS, literacy_content_version="2049-01-01"
        )
        self.assertEqual(
            validated["dev"]["contentVersion"], "1999-01-01-divergent"
        )


if __name__ == "__main__":
    unittest.main()
