# Intent — AID-166 hub resume forward-over-recovery

## Problem

After completing literacy `l02`, hub reload + async verification rejection on l02 flips
«Começar missão» (l03) to «Tentar novamente» (l02). Chapter-continuity smoke times out.

## Outcome

`recommendMission` defers recovery on **completed** missions when another launchable
mission on the same track is still `available`. Forward progress wins until the track
has no remaining `available` missions.

## Scope

`engines/codexdojo-os-prototype` — `recommendation.ts` + unit tests only.

## Constraints

- Student path unchanged (no track picker reopen).
- New test file to satisfy protect-tests; minimal edit to `recommendation.test.ts` with
  `SDLC-ALLOW-TEST-EDIT: AID-166` (superseded case moved to new file).
