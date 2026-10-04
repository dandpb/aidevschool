"""Checkout-relative defaults; live outputs and downloads stay in ignored scratch."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parents[2]
RUNTIME_ROOT = REPO_ROOT / '.scratch' / 'laya-jev'
LAYA_ROOT = Path(os.environ.get('LAYA_ROOT', RUNTIME_ROOT / 'laya')).expanduser().resolve()
OUTPUT_ROOT = Path(os.environ.get('LAYA_JEV_OUTPUT_DIR', RUNTIME_ROOT / 'output')).expanduser().resolve()
os.environ.setdefault('HF_HOME', str(RUNTIME_ROOT / 'hf-cache'))
