# QA-phase scripts — auto re-grant v95 observation bundle (AID-2471)

Executor: QA Lead (ca6a3f95), fresh-context countersign for PR #501 (bot `github-actions[bot]`).
Anchor tree: 4858feab059bbce996d2b4b7fa249845efb1a60b (= main push 97a50adf + factory producer snapshot).

## Independent observation method (this bundle)

1. Walked the cited learner/facilitator surfaces and code seams in this tree; every file:line citation in
   `observations.json` re-verified mechanically (line content read directly) at 4858feab.
2. Drift cause since prior anchors (v92 @3aca4d5d for literacy/corridor/os-literacy; v93 @7c044984 for
   dojotoday) read first-hand from git: PR #500 (c23edd12 + bcfb54a3, merged 97a50adf).
3. Automated producer evidence = CI push run 35390639787 @97a50adf receipts (see ../logs/) + digest-identity
   proof regenerating `producer-report` at this HEAD (13/13 identical to factory snapshot).
4. Executables run in this tree: substrate pytest (214p/1s), dojoToday selfcheck OK.

## Regeneration / verification commands

```bash
python3 -m pytest learner/substrate/tests -q                 # 214 passed, 1 skipped
python3 engines/dojoToday/tools/selfcheck.py                 # OK
# reports at HEAD (digest identity vs factory snapshot):
python3 docs/product-readiness/tools/cli.py producer-report --engine engines/literacyDojo --output <dir> --scenarios literacy-happy-path literacy-retry literacy-resume literacy-corridor-happy-path literacy-corridor-gate-retry literacy-corridor-review-window literacy-corridor-grandfathered-return literacy-corridor-resume-mid-module
python3 docs/product-readiness/tools/cli.py producer-report --engine engines/codexdojo-os-prototype --output <dir> --scenarios os-literacy-hosted-mission os-verification-recovery os-literacy-returning-device
python3 docs/product-readiness/tools/cli.py producer-report --engine engines/dojoToday --output <dir> --scenarios dojotoday-active-unit-guidance dojotoday-returning-next-day
# aggregate -> assess (regrant --propose exit 0 writes v95):
python3 docs/product-readiness/tools/cli.py aggregate --reports <report dirs...> \
  --observations docs/product-readiness/evidence/observations/2026-09-18-4858feab-auto-regrant-v95 \
  --output docs/product-readiness/evidence/producers/2026-09-18-97a50adf-auto-regrant/candidate-v95.json \
  --assessment-id 2026-09-18-4858feab-auto-regrant-v95 --verified-at <ISO> --revalidate-by 2026-10-18
python3 docs/product-readiness/tools/cli.py regrant --propose --input <candidate>
python3 docs/product-readiness/tools/cli.py check --require-current
python3 -m pytest docs/product-readiness/tests -q
```
