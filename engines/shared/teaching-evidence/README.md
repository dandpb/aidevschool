# @aidevschool/evidence

Public TypeScript package for teaching-game evidence envelopes, validation and dual-channel
emission. Pixel and Voxel link this package from their engine-local pnpm workspaces; the repository
root remains package-manager agnostic.

Use the package name `@aidevschool/evidence`. Engine-local adapters may add
typed metrics or review context, but they must not reimplement envelope
validation, browser-global publication, or the `EVIDENCE <json>` console channel.

## Tests (AID-1673, hardening-top10 R3)

Direct suite under `tests/` covering `emit.ts`, `evidenceEnvelope.ts`,
`evidenceTransport.ts` and `funnelTelemetry.ts`. The package declares no
dependencies, so the suite runs from any workspace that links it and has
vitest — CI uses the voxelDojo job. Local repro:

```bash
cd engines/voxelDojo && pnpm install --frozen-lockfile
pnpm exec vitest run -c ../shared/teaching-evidence/vitest.config.ts --reporter=verbose
```

## Mutation proof (gate self-check)

The suite must keep failing when the two real bug classes of
`docs/BUG_AUDIT_2026-07-19.md` (#33 channel overwrite, #34 non-ISO `ts`) or
the invalid-envelope class are reintroduced. Re-verify locally with:

```bash
cd engines/voxelDojo

# M1 invalid envelope: drop the pass check -> suite must fail
python3 - <<'EOF'
p='../shared/teaching-evidence/evidenceEnvelope.ts'; s=open(p).read()
open(p,'w').write(s.replace('''  if (typeof raw["pass"] !== "boolean") {
    throw new EvidenceValidationError("evidence.pass must be boolean")
  }
''',''))
EOF
pnpm exec vitest run -c ../shared/teaching-evidence/vitest.config.ts; git -C ../.. checkout -- engines/shared/teaching-evidence/evidenceEnvelope.ts

# M2 non-ISO ts (BUG_AUDIT #34): drop the ts check -> suite must fail
python3 - <<'EOF'
p='../shared/teaching-evidence/evidenceEnvelope.ts'; s=open(p).read()
open(p,'w').write(s.replace('''  if (typeof timestamp !== "string" || Number.isNaN(Date.parse(timestamp))) {
    throw new EvidenceValidationError("evidence.ts must be an ISO timestamp")
  }
''',''))
EOF
pnpm exec vitest run -c ../shared/teaching-evidence/vitest.config.ts; git -C ../.. checkout -- engines/shared/teaching-evidence/evidenceEnvelope.ts

# M3 channel overwrite (BUG_AUDIT #33): append -> overwrite -> suite must fail
python3 - <<'EOF'
p='../shared/teaching-evidence/evidenceTransport.ts'; s=open(p).read()
for key in ('__pixelQuestEvidence','__voxelDojoEvidence'):
    s=s.replace('''      const previous = Reflect.get(target, "%s")
      Reflect.set(target, "%s", [...(Array.isArray(previous) ? previous : []), record])'''%(key,key),
    '''      Reflect.set(target, "%s", record)'''%key)
open(p,'w').write(s)
EOF
pnpm exec vitest run -c ../shared/teaching-evidence/vitest.config.ts; git -C ../.. checkout -- engines/shared/teaching-evidence/evidenceTransport.ts
```

Verified on 2026-09-13 at the AID-1673 branch head: M1 1 failed, M2 1 failed,
M3 5 failed (baseline 51 passed, 3 consecutive runs).

## Known gaps (follow-up issue, out of AID-1673's tests-only boundary)

- `validateEvidenceEnvelope`'s `ts` check rejects unparseable and non-string
  values, but `Date.parse` still accepts parseable non-ISO formats such as
  `"July 10, 2026"` — the strict ISO 8601 enforcement claimed by BUG_AUDIT #34
  needs a format check and is a behavior change.
- The dormant `game` channel writes a single-record slot; only the
  pixelquest/voxeldojo channels honor the append-only contract of BUG_AUDIT #33.
