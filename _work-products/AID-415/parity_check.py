import json
import subprocess
import sys

sys.path.insert(0, "/paperclip/tmp/aid415-wt")
from learner.gate.teaching_game_bridge import verify_teaching_game_evidence
from learner.gate.tests.teaching_game_bridge_records import (
    SUPPORTED_CASES,
    make_teaching_game_record,
)

JS_SNIPPOT = r"""
import { readFileSync } from "node:fs";
import { verifyTeachingGameEvidence } from "/paperclip/tmp/aid415-wt/learner/gate/netlify-functions/dojo-verification-bridge.mjs";
const cases = JSON.parse(readFileSync(0, "utf8"));
for (const [game, level, record] of cases) {
  const r = verifyTeachingGameEvidence(record);
  console.log(JSON.stringify({ game, level, verdict: r.verdict, independent_pass: r.independent_pass, errors: r.errors, producer_pass_claim: r.producer_pass_claim, unit_id: r.unit_id, scenario_id: r.scenario_id }));
}
"""

def main():
    cases = []
    for game, level in SUPPORTED_CASES:
        cases.append([game, level, make_teaching_game_record(game, level)])
    # failing warehouse levels too
    for level in ["L1", "L2", "L3", "L4"]:
        from learner.gate.tests.teaching_game_bridge_records import make_warehouse_record
        cases.append(["KV WAREHOUSE", level + "-fail", make_warehouse_record(level, passed=False)])
    payload = json.dumps(cases)
    result = subprocess.run(
        ["node", "--input-type=module", "-e", JS_SNIPPOT],
        input=payload, capture_output=True, text=True, check=True,
    )
    js_receipts = [json.loads(line) for line in result.stdout.splitlines()]
    mismatches = 0
    for (game, level, record), js in zip(cases, js_receipts, strict=True):
        py = verify_teaching_game_evidence(record)
        same = (
            py["verdict"] == js["verdict"]
            and py["independent_pass"] == js["independent_pass"]
            and py["producer_pass_claim"] == js["producer_pass_claim"]
            and py["errors"] == js["errors"]
            and py["unit_id"] == js["unit_id"]
            and py["scenario_id"] == js["scenario_id"]
        )
        status = "OK " if same else "MISMATCH"
        if not same:
            mismatches += 1
            print(f"{status} {game:15s} {level:8s} py={py['verdict']}/{py['errors']} js={js['verdict']}/{js['errors']}")
        else:
            print(f"{status} {game:15s} {level:8s} {js['verdict']}")
    print(f"\ncases={len(cases)} mismatches={mismatches}")
    sys.exit(1 if mismatches else 0)

if __name__ == "__main__":
    main()
