# Plan: AID-2493 provenance trailer per agent

Author: Platform & CI Engineer (agent 1e9be0fa) · Change-id: AID-2493-provenance-trailer · Status: approved (small-fix scope, plan recorded per playbook; carrier AID-2493 ack `41cf62a1`)

## Files that change

1. `scripts/sdlc_guard_check.sh` — new check 5 (provenance, advisory):
   - canonical trailer regex
     `^Provenance: agent=<slug> task=(AID|GH)-<n> run=<id> session=<id>$`
     (slug/id charsets: `[A-Za-z0-9][A-Za-z0-9._:-]*`, `run` min 4 chars);
   - in PR context (same `pr_context_json` source as check 4): scan body +
     comments; every valid trailer line → `::notice::provenance trailer
     accepted (AID-2493): agent=… task=… run=… session=… (posted: <when>)`;
   - process-comment detector: a body/comment containing any `Countersign:`
     line or a markdown heading matching `^#+ .*(eredito|erdict)` (covers
     `## Veredito QA countersign…` / `## Verdict…`, PT/EN);
   - process comment without a valid trailer, or with a malformed trailer →
     `::notice::provenance trailer missing|malformed in process comment
     (AID-2493): <first-line snippet>` — NEVER a violation (mitigation
     phase until per-agent credentials, AID-2423);
   - runs regardless of the check-4 trigger (any PR conversation), because it
     is advisory.
2. `docs/sdlc/README.md` — new subsection "Trailer de proveniência por agente
   em comentários de processo (AID-2493)" after the Stage-2 amendment: format,
   binding convention for agents, guard behavior (parse + notice, notice-only
   rationale), relay conduct rule (pointer vs first lane), coordination with
   AID-2423; one row in the guardrails table (advisory/notice).
3. `docs/sdlc/templates/verdict.md` — NEW: canonical templates for (a) the
   countersign verdict comment and (b) the citation comment, both carrying the
   `Provenance:` trailer; short usage notes.
4. `intent/AID-2493-provenance-trailer/` — this record (intent + plan; gate
   (a) analog: producer registry committed on the PR branch).

## Self-test scenarios (hermetic, SDLC_PR_CONTEXT_FILE fixtures)

- process comment (citation) WITH valid trailer → rc 0 + notice "provenance
  trailer accepted" with parsed fields;
- process comment (verdict heading) WITHOUT trailer → rc 0 + notice
  "provenance trailer missing";
- malformed trailer (no session=) → rc 0 + notice "malformed";
- plain non-process comment without trailer → rc 0 and NO provenance notice;
- a non-PR-context run never emits provenance notices (regression of scope).

## Verification

1. `scripts/sdlc_guard_check.sh --self-test` — all scenarios pass locally;
2. live-PR verification: the guard scan of this change's own PR must show the
   accepted-trailer notice for the producer registry comment (exercising the
   feature end to end pre-merge);
3. countersign by the designated QA lane must cite the trailer in its verdict
   (per AID-2493 disposition).

## Rollout / rollback

Single commit, no persisted state, no schema. Rollback = revert the merge.
Notice-only means worst case is noise in guard logs, never a red build.
