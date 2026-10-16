"""Read-only reproduction against the repository gate; all data is temporary."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

import yaml
from learner.gate import verify_and_gate
from learner.gate.tests.test_gate import TODAY, make_evidence, make_state
from learner.substrate.gate import transition_gate

assert subprocess.run(["git", "diff", "--quiet", "origin/main", "HEAD"], cwd=ROOT).returncode == 0
baseline = subprocess.check_output(["git", "rev-parse", "origin/main"], cwd=ROOT, text=True).strip()
with tempfile.TemporaryDirectory(prefix="readiness-gate-probe-") as temporary:
    root = Path(temporary).resolve()
    attempt = root / "learner" / "attempts" / "attempt-1.md"
    attempt.parent.mkdir(parents=True)
    attempt.write_text("# Synthetic learner attempt for an isolated negative probe\n")
    evidence = make_evidence()
    evidence_path = root / "evidence-artifact.json"
    evidence_path.write_text(json.dumps(evidence))
    state = make_state(root)
    state_path = root / "learner" / "learning_state.yaml"
    state_path.write_text(yaml.safe_dump(state))
    before = state_path.read_bytes()
    decision = verify_and_gate(root, evidence_path, TODAY, dry_run=True)
    transitioned = None
    if decision.receipt is not None and decision.ok:
        transitioned = transition_gate(
            state, receipt=decision.receipt, passed=decision.passed,
            gate_outcome=decision.gate_outcome, rating=decision.rating,
            today=TODAY, root=root,
        )
    result = {
        "baseline": baseline,
        "probe": "synthetic-game-metrics-without-independent-verifier",
        "independent_verifier_receipt_supplied": False,
        "actual_game_execution_performed": False,
        "decision_ok": decision.ok,
        "passed": decision.passed,
        "errors": list(decision.errors),
        "gate_outcome": decision.gate_outcome,
        "simulated_active_unit_state": transitioned["active_unit"]["state"] if transitioned else None,
        "temporary_state_was_not_written": before == state_path.read_bytes(),
        "canonical_repository_state_untouched": True,
    }
    print(json.dumps(result, indent=2))
