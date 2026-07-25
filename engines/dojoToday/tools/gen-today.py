#!/usr/bin/env python3
"""Gera o read model `src/data/today.ts` a partir do substrato canônico.

O dojoToday é uma superfície de "lição de hoje" para o público programador.
Ele **não** agenda nem decide mastery: consome o scheduler único
(`learner.substrate.scheduling`) e a fonte da verdade
(`learner/learning_state.yaml`). Regra de ouro do ecossistema: produtor ≠
verificador, filesystem é a fonte da verdade.

Uso (a partir de engines/dojoToday):
    /usr/local/bin/python3 tools/gen-today.py
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import yaml

# repo root = três pastas acima deste arquivo (tools→dojoToday→engines→aidevschool)
REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))

from learner.substrate.scheduling import (  # noqa: E402  (sys.path ajustado acima)
    compute_curr,
    derive_next_reviews,
    reconcile_streak,
)

STATE_PATH = REPO / "learner" / "learning_state.yaml"
OUT_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "today.ts"


def _game_dir(evidence_file: str | None, project: str | None) -> str | None:
    """Extrai o diretório do jogo voxel/pixel a partir do evidence_file da unidade."""
    if not evidence_file:
        return None
    # evidence_file p.ex. "engines/voxelDojo/game-02-warehouse/.logs/evidence.ndjson"
    parts = Path(evidence_file).parts
    for marker in ("voxelDojo", "pixelDojo"):
        if marker in parts:
            idx = parts.index(marker)
            # voxelDojo: marker + subdir do jogo; pixelDojo: só a raiz do engine.
            end = idx + 2 if marker == "voxelDojo" and idx + 1 < len(parts) else idx + 1
            return "/".join(parts[:end])
    return project


def _num_of(project: str | None) -> str | None:
    """Número do projeto a partir do slug (ex.: "02_key_value_store" → "02"). None se não bate."""
    return project.split("_")[0] if project and "_" in project else None


def _build_track(
    units_log: list[dict], active: dict, games: dict[str, dict]
) -> tuple[list[dict], str | None]:
    """Trilha de 18 projetos como átomos jogáveis, com status do learner.

    Função pura (testável): recebe ``units_log`` + ``active`` + ``games`` (num →
    {title, gameDir, port}) e devolve ``(track, next_num)``. Status: ``mastered``
    se alguma unidade masterizada bate o número; ``active`` se é o projeto ativo;
    ``available`` no resto. Sem locks artificiais — a escassez legítima é o gate,
    não progressão forçada (ADR de gamificação: sem hearts/leagues).
    """
    rich_title: dict[str, str] = {}
    for u in units_log:
        num = _num_of(u.get("project"))
        if num:
            rich_title[num] = u.get("concept") or u.get("unit_id")
    active_num = _num_of(active.get("project"))
    if active_num:
        rich_title[active_num] = active.get("title") or active.get("id")

    mastered_nums = {_num_of(u.get("project")) for u in units_log if u.get("mastered")}
    mastered_nums.discard(None)

    track: list[dict] = []
    for n in range(1, 19):
        num = f"{n:02d}"
        game = games.get(num) or {}
        status = "mastered" if num in mastered_nums else "active" if num == active_num else "available"
        track.append(
            {
                "num": num,
                "title": rich_title.get(num) or game.get("title") or num,
                "gameDir": game.get("gameDir"),
                "port": game.get("port"),
                "status": status,
            }
        )
    next_num = next((t["num"] for t in track if t["status"] == "active"), None) or next(
        (t["num"] for t in track if t["status"] == "available"), None
    )
    return track, next_num


def _self_check() -> int:
    """Check framework-free da lógica não-trivial. Rode: `python3 tools/gen-today.py --self-check`."""
    games = {
        "01": {"title": "RATE LIMITER", "gameDir": "engines/pixelDojo/pixel-quest", "port": None},
        "02": {"title": "WAREHOUSE", "gameDir": "engines/voxelDojo/game-02-warehouse", "port": 5202},
        "03": {"title": "WORMHOLE", "gameDir": "engines/voxelDojo/game-03-wormhole", "port": 5203},
    }
    units_log = [
        {"unit_id": "U0", "project": "01_rate_limiter", "concept": "GATEKEEPER", "mastered": True},
        {"unit_id": "U2", "project": "02_key_value_store", "concept": "KV WAREHOUSE", "mastered": False},
    ]
    active = {"project": "02_key_value_store", "title": "KV WAREHOUSE: hash-map-backed CRUD"}

    track, next_num = _build_track(units_log, active, games)
    by_num = {t["num"]: t for t in track}

    assert len(track) == 18, f"trilha deve ter 18 nós, tem {len(track)}"
    assert by_num["01"]["status"] == "mastered", "01 deve ser mastered (U0 masterizado)"
    assert by_num["01"]["title"] == "GATEKEEPER", "título rico de 01 deve vir do concept"
    assert by_num["02"]["status"] == "active", "02 deve ser active (projeto ativo)"
    assert by_num["02"]["title"] == active["title"], "título rico de 02 deve vir do active"
    assert by_num["03"]["status"] == "available", "03 deve ser available"
    assert next_num == "02", f"próximo deve ser 02 (active), veio {next_num}"

    # _game_dir: voxel pega subdir, pixel só raiz, sem evidence → fallback no project.
    assert (
        _game_dir("engines/voxelDojo/game-02-warehouse/.logs/evidence.ndjson", None)
        == "engines/voxelDojo/game-02-warehouse"
    )
    assert _game_dir("engines/pixelDojo/.logs/last_run_evidence.json", None) == "engines/pixelDojo"
    assert _game_dir(None, "99_unknown") is None, "sem evidence_file, não há dir de jogo (None)"

    # Sem projeto ativo: próximo cai no primeiro disponível (02, pois U2 não é mastered).
    _, next_no_active = _build_track(units_log, {}, games)
    assert next_no_active == "02", f"sem active, próximo deve ser 02, veio {next_no_active}"

    print("OK: self-check passou (trilha + game_dir).")
    return 0


def main() -> int:
    state = yaml.safe_load(STATE_PATH.read_text(encoding="utf-8"))
    today = date.today()

    units_log = state.get("units_log") or []
    by_id = {u.get("unit_id"): u for u in units_log if u.get("unit_id")}

    streak = reconcile_streak(state.get("streak") or {}, today)
    # pitfalls=[] em v1: a linha "recurring-trap" viria do parser de pitfalls.md
    # do substrato; adicionar depois sem mudar o contrato deste arquivo.
    reviews = derive_next_reviews(units_log, [], today)
    for r in reviews:
        unit = by_id.get(r["unitId"], {})
        r["gameDir"] = _game_dir(unit.get("evidence_file"), unit.get("project"))
        r["project"] = unit.get("project")

    active = state.get("active_unit") or {}
    active_view = {
        "id": active.get("id"),
        "title": active.get("title"),
        "project": active.get("project"),
        "num": _num_of(active.get("project")),
        "state": active.get("state"),
        "gameDir": _game_dir(active.get("evidence_file"), active.get("project")),
        "diagnosticFile": active.get("diagnostic_file"),
    }

    mastered = sum(1 for u in units_log if u.get("mastered"))

    # --- Trilha: 18 projetos como átomos jogáveis, com status do learner ---
    voxel_catalog = REPO / "engines" / "voxelDojo" / "catalog.json"
    games: dict[str, dict] = {}
    if voxel_catalog.exists():
        for g in json.loads(voxel_catalog.read_text(encoding="utf-8")):
            num = str(g["id"]).split("-")[1]  # "game-02-warehouse" → "02"
            games[num] = {
                "title": g.get("name", num),
                "gameDir": f"engines/voxelDojo/{g['id']}",
                "port": g.get("developmentPort"),
            }
    # 01 e 04 são encontros 2D no pixel-quest (sem jogo voxel dedicado).
    games.setdefault("01", {"title": "RATE LIMITER", "gameDir": "engines/pixelDojo/pixel-quest", "port": None})
    games.setdefault("04", {"title": "TASK QUEUE", "gameDir": "engines/pixelDojo/pixel-quest", "port": None})

    track, next_num = _build_track(units_log, active, games)

    snapshot = {
        "asOf": today.isoformat(),
        "streak": {
            "current": int(streak.get("current", 0)),
            "longest": int(streak.get("longest", 0)),
            "freezesEquipped": int((streak.get("freezes") or {}).get("equipped", 0)),
            "freezesMax": int((streak.get("freezes") or {}).get("max", 0)),
            "lastGateDate": (
                streak.get("last_gate_date").isoformat()
                if hasattr(streak.get("last_gate_date"), "isoformat")
                else streak.get("last_gate_date")
            ),
        },
        "curr": round(compute_curr(units_log, today), 2),
        "activeUnit": active_view,
        "reviews": reviews,
        "masteredCount": mastered,
        "totalUnits": len(units_log),
        "nextProjectNum": next_num,
        "track": track,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    payload = json.dumps(snapshot, indent=2, ensure_ascii=False)
    OUT_PATH.write_text(
        "// AUTO-GERADO por tools/gen-today.py — NÃO EDITAR À MÃO.\n"
        "// Fonte: learner/learning_state.yaml + scheduler learner.substrate.scheduling.\n"
        f"// Regenerado em {today.isoformat()}.\n"
        f"import type {{ TodaySnapshot }} from \"../types\";\n\n"
        f"export const today: TodaySnapshot = {payload} as TodaySnapshot;\n",
        encoding="utf-8",
    )
    print(f"OK: today.ts gerado — {len(reviews)} revisão(ões) devida(s), streak {snapshot['streak']['current']}.")
    return 0


if __name__ == "__main__":
    if "--self-check" in sys.argv:
        raise SystemExit(_self_check())
    raise SystemExit(main())
