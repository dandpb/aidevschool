"""Agent adapters for the OpenClaw scheduler."""

from engines.openclaw.runner.adapters.base import AdapterResult, BaseAdapter, ProducerAdapter
from engines.openclaw.runner.adapters.curator import CuratorAdapter
from engines.openclaw.runner.adapters.dev import DevAdapter
from engines.openclaw.runner.adapters.reviewer import ReviewerAdapter
from engines.openclaw.runner.adapters.benchmarker import BenchmarkerAdapter
from engines.openclaw.runner.adapters.optimizer import OptimizerAdapter
from engines.openclaw.runner.adapters.verifier import VerifierAdapter

__all__ = [
    "AdapterResult",
    "BaseAdapter",
    "ProducerAdapter",
    "CuratorAdapter",
    "DevAdapter",
    "ReviewerAdapter",
    "BenchmarkerAdapter",
    "OptimizerAdapter",
    "VerifierAdapter",
]
