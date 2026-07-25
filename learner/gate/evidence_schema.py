from __future__ import annotations

import json
from pathlib import Path
from typing import Any

LITERACY_EVIDENCE_SCHEMA_PATH = Path(__file__).with_name(
    "literacy_evidence.schema.json"
)
LITERACY_EVIDENCE_SCHEMA: dict[str, Any] = json.loads(
    LITERACY_EVIDENCE_SCHEMA_PATH.read_text(encoding="utf-8")
)
