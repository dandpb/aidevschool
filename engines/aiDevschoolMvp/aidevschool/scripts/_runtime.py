"""_runtime.py — resolves the deterministic gate runtime for both layouts and is
the single place that knows about either. Installed skill folders carry flat
`_core`/`_engine`/`_state` modules written by install.py; the repository carries
`learner.gate.*`. Every §4.2 entry point imports `core`/`engine`/`state` here."""
from __future__ import annotations

import importlib
import sys
from pathlib import Path
from typing import Any

try:
    core: Any = importlib.import_module("_core")
    engine: Any = importlib.import_module("_engine")
    state: Any = importlib.import_module("_state")
except ModuleNotFoundError:
    sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
    core = importlib.import_module("learner.gate.core")
    engine = importlib.import_module("learner.gate.engine")
    state = importlib.import_module("learner.gate.state")
