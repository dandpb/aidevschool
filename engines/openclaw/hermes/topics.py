"""Canonical Hermes topics and payload schemas."""

from engines.openclaw._compat import StrEnum


class Topic(StrEnum):
    """Topics from the OpenClaw/Hermes runbook."""

    UNIT_SELECTED = "dojo.unit.selected"
    SPEC_READY = "dojo.spec.ready"
    IMPL_READY = "dojo.impl.ready"
    TESTS_READY = "dojo.tests.ready"
    REVIEW_READY = "dojo.review.ready"
    METRICS_READY = "dojo.metrics.ready"
    MEMORY_UPDATED = "dojo.memory.updated"


# Minimal payload schemas for simulation-mode validation.
TOPIC_REQUIRED_KEYS: dict[Topic, list[str]] = {
    Topic.UNIT_SELECTED: ["unit_id", "project_path", "prerequisite_evidence"],
    Topic.SPEC_READY: ["spec_path", "adr_path"],
    Topic.IMPL_READY: ["implementation_path", "test_command"],
    Topic.TESTS_READY: ["test_results", "coverage_path"],
    Topic.REVIEW_READY: ["findings_path"],
    Topic.METRICS_READY: ["scorecard_path"],
    Topic.MEMORY_UPDATED: ["profile_path", "next_action"],
}
