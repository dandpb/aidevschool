"""Tests for the multi-tenant server-mode spike (ADR-0008, option C).

The spike is read-only: it resolves ``learner_id`` to a filesystem instance and
returns the canonical state loaded by the existing substrate — no auth, no
writes, no locks. These tests prove the adapter works on top of the real
substrate without modifying it.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from learner.service import app as service_app
from learner.service.app import app

REPO_ROOT = Path(__file__).resolve().parents[3]
PILOT_LEARNER_ID = "daniel-barreto"


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def test_pilot_learner_state_is_served(client: TestClient):
    """The real pilot instance (learner.id == daniel-barreto) resolves."""
    response = client.get(f"/learners/{PILOT_LEARNER_ID}/state")
    assert response.status_code == 200
    body = response.json()
    assert body["learner_id"] == PILOT_LEARNER_ID
    assert body["valid"] is True
    assert body["validation_errors"] == []
    assert body["state"]["learner"]["id"] == PILOT_LEARNER_ID
    assert body["state"]["version"] == 2


def test_unknown_learner_returns_404(client: TestClient):
    response = client.get("/learners/nobody-here/state")
    assert response.status_code == 404


def test_unsafe_learner_ids_are_rejected(client: TestClient):
    """Path-traversal-shaped ids never reach the filesystem."""
    for unsafe in ("..", "../learner", "a/b", "UPPER", "", "x" * 100):
        response = client.get(f"/learners/{unsafe}/state")
        assert response.status_code in (404, 422), unsafe


def test_instances_shard_is_preferred_over_pilot(client: TestClient, tmp_path: Path):
    """learner/instances/<id>/ wins over the pilot file when both exist."""
    # Build a fake root mirroring the repo layout with one shard.
    shard_dir = tmp_path / "learner" / "instances" / "jane"
    shard_dir.mkdir(parents=True)
    shutil.copy(
        REPO_ROOT / "learner" / "learning_state.yaml",
        shard_dir / "learning_state.yaml",
    )
    pilot = tmp_path / "learner" / "learning_state.yaml"
    shutil.copy(REPO_ROOT / "learner" / "learning_state.yaml", pilot)

    # Point the service at the fake root.
    original_root = service_app.REPO_ROOT
    service_app.REPO_ROOT = tmp_path
    try:
        response = client.get("/learners/jane/state")
        assert response.status_code == 200
        body = response.json()
        assert body["learner_id"] == "jane"
        assert body["canonical_path"].startswith("learner/instances/jane/")
    finally:
        service_app.REPO_ROOT = original_root


def test_health_endpoint(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["mode"] == "spike"
    assert body["auth"] == "none"
