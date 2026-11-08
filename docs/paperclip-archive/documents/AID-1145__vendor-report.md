<!-- issue: AID-1145 | key: vendor-report | doc_id: 90bc6565-029e-49a8-9d5e-ceb9ae1f200b | updated: 2026-09-09 23:15:46.239+00 -->

# Vendor report — Paperclip board UX: aggregate surface for pending interactions, guard-card acceptance trap, chip deep-links

(AID-1145)

# Board UX: pending issue-thread interactions stranded on `done` host issues — no aggregate resolution surface, guard-card acceptance confusable with resolution, chips don't deep-link

> Prepared for the Paperclip maintainers (github.com/paperclipai/paperclip). Suggested labels: `area/board-ui`, `area/interactions`, `type/feature-request`.

## Environment

- Paperclip CLI `paperclipai@2026.626.0` (npm), authenticated deployment, private exposure, embedded Postgres; board UI served by the CLI.
- Board user on Chrome/macOS. Agents as producers, one human board user as verifier.

## Summary

Our board user twice declared they had "resolved" 8 pending issue-thread interactions (7 `request_confirmation`, 1 `ask_user_questions`) hosted on 7 issues that are all in status `done`. Server logs prove **zero resolution requests ever reached the server** — this is not a persistence bug. The user simply never reached a surface where the per-interaction accept/reject/cancel actions live, because:

1. **No aggregate surface.** There is no inbox/board/global list of pending interactions anywhere in the board UI (the OpenAPI surface exposes only per-issue interaction routes). The only resolution surface is the Interactions section of each host issue's own page.
2. **Guard-card acceptance trap.** The user *did* accept a guard card (a `request_confirmation` on a still-open watchdog issue) whose body text lists the 8 stale interactions. Accepting that card is easily read as "resolve everything listed" — it does not cascade, and nothing in the UI communicates that it doesn't.
3. **Chips prefetch but don't navigate.** Issue chips rendered inside that card trigger parallel `GET /issues/{id}` bursts (mention-chip hydration in the UI bundle, `staleTime: 60s`) — but they do not deep-link to the pending interaction's card on the host issue, so "clicking through the chips" feels like having handled them while no host page is ever mounted.
4. **Invisible supersede affordance.** The product already auto-expires pending `request_confirmation`s with `supersedeOnUserComment: true` when a *user* comments on the host issue (`expireRequestConfirmationsSupersededByComment` in `services/issue-thread-interactions.js`) — the cheapest cleanup path, and it is completely undiscoverable.

## Forensic evidence (server.log, 2026-09-09)

Board user `W4VteL…` (Chrome/macOS), window 22:20–22:45Z:

| Observation | Evidence (server.log lines) | Interpretation |
|---|---|---|
| Only interaction mutations by the browser in the window: `accept` ×2 on the guard-card host issue | 87812 `[18:26:45]` (card `452fd60c`, "Resolvi as 5 + adoto (a)"), 89062 `[18:41:12]` (card `c0c8d8cd`, "Resolvi os 8 agora (clique em cada um)") | User accepted guard cards believing this resolved the listed interactions |
| Zero `POST` accept/cancel/reject/respond for any of the 8 target interactions, all day | full-day segment sweep (lines 86200–91396, monotonic req-id 1160→9300, single process) | Nothing was lost in persistence — nothing was ever submitted |
| Parallel GET bursts on the 7 host issues, 7 requests in ≤3 s | 87456–87624 (18:25:58–18:26:01), 88826–88935 (18:40:41–18:40:43), 89278–89303 (18:42:35–39) | Mention-chip prefetch on card render, not navigation |
| No host page ever mounted: every genuinely opened issue triggers `GET /comments` + `/interactions` + `/activity` + `/live-runs`; zero such fetches for the 7 hosts | contrast with guard-card host and 4 other issues opened the same night | User never saw the interactions section of any host |
| 13× `POST /issues/{id}/read` in the window | mark-as-read requests | Likely the gesture the user interpreted as "resolving" |

Despite an explicit explanation posted between the two attempts ("accepting the card does NOT resolve the individual interactions; open each of the 8 issues and cancel/accept as superseded"), the second attempt also had zero effect — strong signal that the reachable UI actively invites the wrong mental model.

## Reproduction

1. Leave N interactions `pending` on host issues that reach `done`.
2. From the board UI, try to find any list of pending interactions that spans issues (there is none).
3. Open a guard card on an unrelated open issue whose body lists those interactions; accept it.
4. Observe: all N interactions remain `pending`; no surface ever offered a per-item action.

## Feature requests

**FR-1 — Aggregated pending-interaction surface (inbox/board) with per-item and bulk actions.**
Accept/reject/cancel per item *and* bulk (select-all, batch accept/reject/cancel), independent of host issue status (`done` hosts included). Suggested acceptance criteria: a board user can enumerate every `pending` interaction they can resolve and clear all of them from one screen, without opening host issues.

**FR-2 — Guard-card acceptance must not be confusable with resolving listed interactions.**
When a `request_confirmation` body references other pending interactions, either (a) offer an explicit cascade option ("also resolve the N listed interactions"), or (b) render an explicit warning on accept: "This does NOT resolve the N interactions listed below". At minimum, (b).

**FR-3 — Issue chips inside interaction cards should deep-link to the pending interaction.**
A chip for an issue with a pending interaction should link to an anchor on the host issue page that scrolls to/focuses that interaction's card (or open a hover-card with the action buttons), instead of only hydrating a prefetch.

**FR-4 — Make the comment-supersedes-confirmation affordance visible.**
`supersedeOnUserComment` + `expireRequestConfirmationsSupersededByComment` already implement "user comment on host expires pending confirmation". Surface it: hint text on pending confirmations ("Reply on this issue to supersede this confirmation"), and/or a compose affordance from the pending list in FR-1.

## Verified NOT a problem (please keep as-is)

- **Persistence** — no writes were lost; none were submitted.
- **Agent-side resolution 403** ("board-only route", `rejectAgentIssueThreadInteractionResolution`) is by design and correct — producer ≠ verifier separation should be preserved. No change requested.
- **Interactions on `done` hosts are resolvable via the host page** — accept/cancel/reject/respond routes have no status gate; `isTerminalIssueStatus` only affects return-to-assignee behavior. Reachability is the gap, not permission.

## Workaround in the meantime

Per host issue: either post a user comment (auto-supersedes pending `request_confirmation`s with `supersedeOnUserComment: true`) or open the host and cancel/respond manually. `ask_user_questions` interactions require the manual cancel/respond path.

---

*Internal trace: delegated from AID-1132 (forensic verdict, comment 38693420); immediate cleanup tracked separately on the guard-card host issue. 8 interactions still `pending` as of 2026-09-09T23:5xZ across 7 `done` hosts (`d98909b7`, `59be964e`, `9d74f9c1`, `4491a8cb`, `f1ef2eab`, `de8ba32c`, `27358c47`, `62bde8b8`).*
