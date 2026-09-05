from __future__ import annotations

from typing import Any


def make_literacy_record(**overrides: Any) -> dict[str, Any]:
    base = {
        "schemaVersion": 1,
        "source": "literacydojo",
        "attemptId": "att-000001",
        "lessonId": "l02",
        "lessonVersion": 4,
        "activityId": "l02-a1",
        "activityType": "output_comparison",
        "skillIds": ["entender", "avaliar"],
        "deterministicChecks": {
            "betterOutputId": True,
            "c-fontes": True,
            "c-limites": True,
            "noExtraCriteria": 0,
        },
        "score": 1.0,
        "pass": True,
        "timestamp": "2026-07-25T12:00:00.000Z",
        "verifierRequired": True,
        "answer": {
            "outputId": "out-b",
            "criterionIds": ["c-fontes", "c-limites"],
        },
        "context": "initial",
    }
    base.update(overrides)
    return base
