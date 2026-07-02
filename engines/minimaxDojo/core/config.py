"""Config seam loader for Ágora Continuum thresholds.

The single source of truth for numeric thresholds is
`engines/minimaxDojo/config/learner.yaml` (the "threshold seam" described in
CONTEXT.md). This module loads that file and exposes the values the empirical
gate and the state machine need, so those modules stop hardcoding their own
copies (see TECH_DEBT_AUDIT_2026-06-28.md, D8).

Both PyYAML and the config file are optional at import time: if either is
missing, the FALLBACK_* constants are used so the core stays importable in a
minimal environment.
"""

from __future__ import annotations

from pathlib import Path

# Last-resort defaults — used ONLY when learner.yaml or PyYAML is unavailable.
# In normal operation the live values come from the YAML config.
FALLBACK_MUTATION = 0.65
FALLBACK_COVERAGE = 0.80
FALLBACK_MAX_RETRIES = 3

_DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "learner.yaml"


def load_learner_config(path: str | Path | None = None) -> dict:
    """Load the learner config YAML. Returns {} if PyYAML or the file is absent."""
    try:
        import yaml
    except ImportError:
        return {}
    config_path = Path(path) if path is not None else _DEFAULT_CONFIG_PATH
    if not config_path.exists():
        return {}
    with config_path.open("r", encoding="utf-8") as handle:
        for doc in yaml.safe_load_all(handle):
            if isinstance(doc, dict):
                return doc
    return {}


def gate_thresholds(config: dict | None = None) -> tuple[float, float]:
    """Return (mutation_threshold, coverage_threshold) from the seam, with fallbacks."""
    cfg = config if config is not None else load_learner_config()
    gates = cfg.get("gates", {}) if isinstance(cfg, dict) else {}
    mutation = gates.get("mutation_score_min", FALLBACK_MUTATION)
    coverage = gates.get("cobertura_nucleo_min", FALLBACK_COVERAGE)
    return float(mutation), float(coverage)


def max_retries(config: dict | None = None) -> int:
    """Return retries.max_por_unidade from the seam, with fallback."""
    cfg = config if config is not None else load_learner_config()
    retries = cfg.get("retries", {}) if isinstance(cfg, dict) else {}
    return int(retries.get("max_por_unidade", FALLBACK_MAX_RETRIES))
