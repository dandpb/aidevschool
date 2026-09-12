# AID-128 — Independent review

**Verdict: ACCEPT**

Independent verifier: Founding Product Engineer verifier context (separate from producer).
Review date: 2026-08-24.

## Outcome

The cross-device promotion defect is fixed with independently accepted executable evidence. The pilot stage is created beside `dist`, the promotion and rollback sequence is isolated behind injectable filesystem operations, a failed stage promotion restores the previous bundle, and simultaneous promotion/rollback failures preserve both errors in an `AggregateError`.

The focused suite passes 7/7 and the real integrated pilot build completes with all five required surfaces. No blocking findings remain in the reviewed scope.

## Accepted invariants

### Same-filesystem promotion

- `scripts/pilot-bundle-lib.mjs:5-7` creates the stage under `dirname(output)`.
- The test compares both the parent directory and `stat.dev`, preventing the former `/tmp`-to-workspace `EXDEV` path.
- `build-pilot-bundle.mjs` uses that stage for the final promotion to engine-local `dist`.

### Rollback preserves the previous bundle

- `promotePilotBundle` first renames the previous output to its backup, then promotes the staged bundle.
- The injectable operations seam deterministically forces the second rename to fail.
- The test proves the exact recovery sequence: `dist -> backup`, failed `stage -> dist`, then `backup -> dist`.

### Rollback failures remain observable

- If both promotion and restoration fail, `promotePilotBundle` throws an `AggregateError` containing both original errors.
- The focused test asserts both messages, eliminating the previously silent rollback failure.

### Bundle completeness before promotion

- Manifest creation requires each pilot surface and hashes its entry.
- Verification checks entry hashes and complete file inventory before promotion.
- The integrated build produced OS, LiteracyDojo, WAREHOUSE, WORMHOLE, and RELAY STATION and completed promotion.

## Commands and results

From `engines/codexdojo-os-prototype`:

```text
$ npm run test:pilot-bundle
tests 7; pass 7; fail 0; duration 140.240979ms
```

Covered explicitly:

- same-filesystem staging;
- restoration after promotion failure;
- combined promotion and rollback failure reporting;
- valid complete bundle acceptance;
- missing surface rejection;
- post-manifest tampering rejection;
- rejection before deploy spawn for a partial bundle.

```text
$ npm run build:pilot
exit 0
[pilot] complete bundle ready at .../engines/codexdojo-os-prototype/dist
```

The build emitted only Vite chunk-size warnings for two voxel surfaces. Those warnings are pre-existing optimization signals and do not affect bundle integrity, atomic rename eligibility, or rollback behavior.

## Final disposition

**ACCEPT.** AID-128 has independent evidence for the same-filesystem promotion invariant, successful integrated assembly, restoration of the previous bundle on promotion failure, and observable failure when restoration itself cannot complete.
