"""Fixture tree for the judgment-enrichment checks (hermetic: no repo data, no network).

Mirrors the real learner data shapes at reduced size: 1 pitfall (the real
2026-06-18 trap), a 51-entry journal (the real entry count), the real 4-row
Dreyfus x Bloom matrix, and 2 mastered units in units_log.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

#: Injected ``today`` so every derivation (streak, CURR, nextReviews) is deterministic.
FIXTURE_TODAY = date(2026, 9, 17)

#: Journal-entry indices the live 2026-09-17 sweep scored >= 0.5 (21 of 51):
#: e28 + e29..e45 (the 17 ungated verification entries) + e46, e47, e50.
RECORDED_HIT_INDICES = frozenset([28, *range(29, 46), 46, 47, 50])

STATE: dict[str, Any] = {
    "version": 2,
    "system": "agora-continuum",
    "learner": {
        "id": "fixture-learner",
        "level": "intermediate",
        "active_language": "TypeScript",
        "weekly_time_hours": 5,
        "aidi": {
            "current": 0.34,
            "threshold_amber": 0.6,
            "threshold_red": 0.75,
            "measurement_source": "self_reported",
            "history": [],
        },
    },
    "active_unit": {
        "id": "U2-key-value-store",
        "title": "KV WAREHOUSE",
        "project": "02_key_value_store",
        "state": "mastered",
        "retry_count": 0,
        "retry_limit": 3,
    },
    "gate": {"implementation_blocked": False},
    "units_log": [
        {
            "unit_id": "U0-sonda-rate-limiter-robustness",
            "concept": "GATEKEEPER: token-bucket robustness",
            "project": "01_rate_limiter",
            "mastered": True,
            "reviews": [
                {"date": date(2026, 6, 9), "event": "presented"},
                {"date": date(2026, 7, 5), "event": "gate", "rating": "good"},
            ],
        },
        {
            "unit_id": "U2-key-value-store",
            "concept": "KV WAREHOUSE: CRUD with TTL",
            "project": "02_key_value_store",
            "mastered": True,
            "reviews": [
                {"date": date(2026, 7, 11), "event": "presented"},
                {"date": date(2026, 8, 13), "event": "gate", "rating": "good"},
            ],
        },
    ],
    "streak": {
        "current": 2,
        "longest": 2,
        "last_gate_date": date(2026, 8, 13),
        "freezes": {"equipped": 2, "max": 2},
    },
}

PITFALLS_MD = """# Memoria de Pegadinhas

## [2026-06-18] Reivindicar dominio a partir de trabalho de documentacao/dashboard
- Contexto: audit de gap prompt-vs-implementacao no codexDojo.
- Erro: tentar elevar niveis Dreyfus/Bloom com base em trabalho de docs.
- Conceito correto: dominio exige tentativa de codigo e evidencia executavel do verifier.
- Reforco agendado: revisar a cada novo ciclo antes de o registrar atualizar o perfil.
"""

PROFILE_MD = """# Perfil do Aprendiz

## Matriz de competencia (Dreyfus x Bloom)

| Conceito | Estagio (Dreyfus) | Nivel cognitivo (Bloom) | Evidencia |
|----------|-------------------|-------------------------|-----------|
| Test Design | Intermediario (Competent) | Aplicar (Apply) | Casos cobrindo limites. |
| Raciocinio de Concorrencia | Avancado (Proficient) | Analisar (Analyze) | Escopo de concorrencia explicito. |
| Tratamento de Erro | Intermediario (Competent) | Aplicar (Apply) | Contratos HTTP seguidos. |
| Instinto de Refatoracao | Intermediario (Competent) | Analisar (Analyze) | Riscos associados a passos reversiveis. |

## Pre-requisitos comprovados

- (vazio no fixture)
"""

#: Portuguese-only cells: no English keyword anywhere, so the parser silently
#: keeps its defaults (competent/apply) — the fragility C10 exercises.
PT_ONLY_PROFILE_MD = """# Perfil do Aprendiz

| Conceito | Estagio | Nivel |
|----------|---------|-------|
| Test Design | Avancado | Analisar |

## Pre-requisitos comprovados

- (vazio)
"""

JOURNAL_TITLES = [f"Journal lesson {i:02d} (2026-06-03, project 01)" for i in range(51)]

JOURNAL_MD = "# Journal\n\n" + "\n".join(
    f"### {title}\n\nLesson body {i:02d}: lazy refill, clock injection, single mutex.\n"
    for i, title in enumerate(JOURNAL_TITLES)
)

CATALOG_MD = """# Catalog

## Level 1 — Fundamentals

### 01. Rate Limiter (Token Bucket)

| **Slug** | 01_rate_limiter |
| **Status** | ✅ Implemented |
| **Concepts** | Token bucket, robustness |
| **Key question** | Como limitar com burst? |
| **Directory** | curriculum/01_rate_limiter |
| **Dependencies** | none |
| **Evidence** | Catalog-certified executable evidence. |

### 02. Key-Value Store (in-memory)

| **Slug** | 02_key_value_store |
| **Status** | scaffolded |
| **Concepts** | Hash-map CRUD, TTL |
| **Key question** | Como expirar chaves? |
| **Directory** | curriculum/02_key_value_store |
| **Dependencies** | 01 |
| **Evidence** | Catalog-certified executable evidence. |
"""


def write_fixture_tree(root: Path) -> Path:
    """Write the fixture source tree under ``root`` and return it."""
    (root / "learner").mkdir(parents=True, exist_ok=True)
    (root / "curriculum").mkdir(parents=True, exist_ok=True)
    (root / "learner" / "pitfalls.md").write_text(PITFALLS_MD, encoding="utf-8")
    (root / "learner" / "learner_profile.md").write_text(PROFILE_MD, encoding="utf-8")
    (root / "learner" / "journal.md").write_text(JOURNAL_MD, encoding="utf-8")
    (root / "curriculum" / "catalog.md").write_text(CATALOG_MD, encoding="utf-8")
    return root
