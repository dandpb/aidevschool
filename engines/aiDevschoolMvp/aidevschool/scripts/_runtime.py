from __future__ import annotations

import importlib
import sys
from pathlib import Path
from typing import Any

scripts_dir = str(Path(__file__).resolve().parent)
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)
core: Any = importlib.import_module("_core")
engine: Any = importlib.import_module("_engine")
state: Any = importlib.import_module("_state")
