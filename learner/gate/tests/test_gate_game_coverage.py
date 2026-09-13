"""Coverage tripwire: voxelDojo producers x independent gate evaluators.

Anti-drift test (AID-1594 / verifier-map §7, L5): a game added to
``engines/voxelDojo/catalog.json`` without an independent evaluator in
``GAME_SPECS``, an orphan evaluator, a unitId/project identity drift, or a
curriculum project silently added/removed must fail CI here — exactly the way
``scripts/precheck`` ``anchorCheckIds`` pins its check registry. Known debts
live in the explicit allowlists below and must be removed consciously, in the
same PR that fixes the debt (additions/removals are reviewable by diff).

The allowlists are STRICT in both directions: an unlisted gap fails, and a
listed entry whose debt no longer exists also fails (stale debt = drift).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from learner.gate.teaching_game_bridge import GAME_SPECS

REPO_ROOT = Path(__file__).resolve().parents[3]
VOXEL_CATALOG = REPO_ROOT / "engines" / "voxelDojo" / "catalog.json"
CURRICULUM_CATALOG = REPO_ROOT / "curriculum" / "catalog.md"

# Games known to have NO independent evaluator in GAME_SPECS yet
# (verifier-map §4: 10 of 19 projects lack a gate path). Each entry must be
# removed in the same PR that ships the game's evaluator.
ALLOWED_UNVERIFIED: frozenset[str] = frozenset(
    {
        "game-10-hash-ring",  # evaluator blocked on unitId fix (catalog.json:48)
        "game-11-air-traffic",  # evaluator planned (AID-1594 PR2)
        "game-12-mission-control",  # evaluator planned (AID-1594 PR2)
        "game-13-breaker-grid",
        "game-14-river-delta",
        "game-15-observatory",
        "game-16-freight-yard",
        "game-17-lighthouse-network",
        "game-18-stacks",
    }
)

# Known catalog unitId quirks: game number != unit number prefix. Pinned to
# the exact (game id, unitId) pair so any change — the fix OR a new breakage —
# fails until this allowlist is consciously updated.
ALLOWED_UNITID_QUIRKS: dict[str, str] = {
    # engines/voxelDojo/catalog.json:48 — U9 collides with game-09 (U9-plugin-system);
    # owned by the Curriculum Platform Engineer (verifier-map L4).
    "game-10-hash-ring": "U9-distributed-cache",
}

# Curriculum projects with no producing game (known gaps, verifier-map §4).
ALLOWED_PROJECTS_WITHOUT_GAME: frozenset[str] = frozenset(
    {
        "00_ai_in_practice",  # no-code track: literacy + ADR-0004 checklist, no voxelDojo game
        "01_rate_limiter",  # legacy GATEKEEPER rubric gate, closed 2026-07-05
        "04_concurrent_task_queue",  # no producer planned yet (verifier-map L2)
    }
)

# Catalog game names that differ from their GAME_SPECS key (kept for receipt
# stability). Maps catalog name -> GAME_SPECS key.
GAME_NAME_ALIASES: dict[str, str] = {"WAREHOUSE": "KV WAREHOUSE"}

SLUG_LINE = re.compile(r"^\| \*\*Slug\*\* \| `([a-z0-9_]+)` \|$", re.MULTILINE)


def _load_voxel_catalog() -> dict[str, dict[str, str]]:
    raw = json.loads(VOXEL_CATALOG.read_text(encoding="utf-8"))
    catalog: dict[str, dict[str, str]] = {}
    for entry in raw:
        catalog[str(entry["id"])] = {
            "name": str(entry["name"]),
            "unitId": str(entry["unitId"]),
        }
    return catalog


def _load_curriculum_slugs() -> dict[str, str]:
    """project number ('02') -> slug, from curriculum/catalog.md."""
    slugs = SLUG_LINE.findall(CURRICULUM_CATALOG.read_text(encoding="utf-8"))
    return {slug.split("_", 1)[0]: slug for slug in slugs}


def _game_number(game_id: str) -> int:
    match = re.match(r"^game-(\d+)-", game_id)
    assert match, f"voxelDojo game id does not match 'game-NN-*': {game_id}"
    return int(match.group(1))


def _unit_number(unit_id: str) -> int:
    match = re.match(r"^U(\d+)-", unit_id)
    assert match, f"unitId does not match 'UNN-*': {unit_id}"
    return int(match.group(1))


def _name_slug(name: str) -> str:
    return name.strip().lower().replace(" ", "-")


def _spec_name(catalog_name: str) -> str:
    return GAME_NAME_ALIASES.get(catalog_name, catalog_name)


def test_every_catalog_game_has_evaluator_or_explicit_allowlist_entry() -> None:
    catalog = _load_voxel_catalog()
    spec_names = set(GAME_SPECS)
    verified = {_spec_name(entry["name"]) for entry in catalog.values()} & spec_names
    unverified = {
        game for game in catalog if _spec_name(catalog[game]["name"]) not in spec_names
    }

    unlisted = unverified - ALLOWED_UNVERIFIED
    stale = ALLOWED_UNVERIFIED - unverified

    assert not unlisted, (
        "voxelDojo games without an independent GAME_SPECS evaluator "
        f"(add evaluators or extend the allowlist consciously): {sorted(unlisted)}"
    )
    assert not stale, (
        "ALLOWED_UNVERIFIED is stale — these games now have evaluators; "
        f"shrink the allowlist in the same PR: {sorted(stale)}"
    )
    assert verified, "no verified games found at all — GAME_SPECS is empty?"


def test_no_orphan_evaluators() -> None:
    catalog = _load_voxel_catalog()
    names = {_spec_name(entry["name"]) for entry in catalog.values()}
    orphans = sorted(set(GAME_SPECS) - names)

    assert not orphans, (
        f"GAME_SPECS evaluators with no voxelDojo catalog game: {orphans}"
    )


def test_unitid_matches_game_number_except_pinned_quirks() -> None:
    catalog = _load_voxel_catalog()
    for game_id, entry in sorted(catalog.items()):
        expected_quirk = ALLOWED_UNITID_QUIRKS.get(game_id)
        if expected_quirk is not None:
            assert entry["unitId"] == expected_quirk, (
                f"{game_id} unitId changed from pinned quirk "
                f"{expected_quirk!r} to {entry['unitId']!r} — update "
                "ALLOWED_UNITID_QUIRKS consciously (or drop the entry if fixed)"
            )
            continue
        assert _unit_number(entry["unitId"]) == _game_number(game_id), (
            f"{game_id} carries unitId {entry['unitId']!r} whose number prefix "
            "does not match the game number"
        )

    stale = sorted(
        game
        for game in ALLOWED_UNITID_QUIRKS
        if game not in catalog or catalog[game]["unitId"] != ALLOWED_UNITID_QUIRKS[game]
    )
    assert not stale, (
        f"ALLOWED_UNITID_QUIRKS stale (fixed or renamed games): {stale}"
    )


def test_evaluated_games_bind_to_real_curriculum_projects() -> None:
    catalog = _load_voxel_catalog()
    slugs = _load_curriculum_slugs()
    names = {
        _spec_name(entry["name"]): game for game, entry in catalog.items()
    }

    for game_name, spec in sorted(GAME_SPECS.items()):
        unit_id, project, scenario_prefix, _ = spec
        game_id = names[game_name]
        number = f"{_game_number(game_id):02d}"

        assert project in slugs.values(), (
            f"{game_name} evaluator points at project {project!r} which is not "
            "a curriculum/catalog.md Slug"
        )
        assert project.split("_", 1)[0] == number, (
            f"{game_name} evaluator project {project!r} does not match game "
            f"number {number}"
        )
        assert unit_id == catalog[game_id]["unitId"], (
            f"{game_name} GAME_SPECS unit_id {unit_id!r} diverged from the "
            f"catalog unitId {catalog[game_id]['unitId']!r}"
        )
        assert scenario_prefix == f"{_name_slug(game_name)}-", (
            f"{game_name} scenario prefix {scenario_prefix!r} does not follow "
            "the GAME_SPECS game name"
        )


def test_curriculum_project_inventory_is_the_expected_19() -> None:
    slugs = _load_curriculum_slugs()
    expected_numbers = {f"{number:02d}" for number in range(19)}

    assert set(slugs) == expected_numbers, (
        "curriculum/catalog.md project inventory drifted from 00-18: "
        f"added={sorted(set(slugs) - expected_numbers)} "
        f"removed={sorted(expected_numbers - set(slugs))}"
    )
    assert len(slugs) == 19, "duplicate project numbers in catalog.md"

    catalog = _load_voxel_catalog()
    game_numbers = {_game_number(game) for game in catalog}
    without_game = {
        slug
        for number, slug in slugs.items()
        if int(number) not in game_numbers
    }
    unlisted = without_game - ALLOWED_PROJECTS_WITHOUT_GAME
    stale = ALLOWED_PROJECTS_WITHOUT_GAME - without_game

    assert not unlisted, (
        "curriculum projects without a producing game (and without an explicit "
        f"allowlist entry): {sorted(unlisted)}"
    )
    assert not stale, (
        f"ALLOWED_PROJECTS_WITHOUT_GAME stale: {sorted(stale)}"
    )
