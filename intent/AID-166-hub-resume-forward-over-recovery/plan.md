# Plan — AID-166 hub resume forward-over-recovery

## Problem

After completing literacy `l02`, async verification rejection on the completed mission
made `recommendMission` prefer recovery retry over starting unlocked `l03`.

## Change

- `recommendation.ts`: defer verification/local recovery when mission is `completed`
  and another launchable mission on the same track is still `available`.
- New unit file `recommendation.forward-over-recovery.test.ts` (protect-tests safe).
- Remove superseded case from `recommendation.test.ts` (SDLC-ALLOW-TEST-EDIT: AID-166).

## Proof

```bash
cd engines/codexdojo-os-prototype
npm run lint && npm run test && npm run build
```
