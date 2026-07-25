#!/usr/bin/env python3
"""Thin wrapper that runs the substrate dojoToday self-check.

Keeps engines/dojoToday decoupled from PYTHONPATH: it inserts the repo root
before importing the substrate adapter.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))

from learner.substrate.adapters.dojotoday import _self_check  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(_self_check())
