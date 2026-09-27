# AI DevSchool v0.1 release scope

| Field | Frozen decision |
| --- | --- |
| Decision status | Approved product baseline for v0.1 |
| Target | `v0.1.0-rc.1` |
| Canonical front door | `engines/codexdojo-os-prototype/` root route |
| Audiences | **IA Prática** (nontechnical) and **Trilha Dev** (programmers) |
| Launch catalog | Three ready missions per audience, six total |
| Delivery model | Local-first static/browser experience; contributor-prepared local services only |
| Growth rule | No new engine, mission, track, backend, account, sync, or public-AI dependency before RC |

This is the release decision downstream work should use. Product vision remains in
[`VISION.md`](VISION.md); implementation and evidence contracts remain with their owning
surfaces. If another document calls `codexDojo`, LiteracyDojo, or miniTown the product entry,
this decision wins for v0.1: the OS root route is the only learner front door.

## Launch promise

AI DevSchool v0.1 offers one short, practical learning rhythm to two audiences:

- **IA Prática:** three bounded AI-literacy missions executed by LiteracyDojo.
- **Trilha Dev:** three project-linked spatial missions executed by voxelDojo
  (`WAREHOUSE`, `WORMHOLE`, and `RELAY STATION`).

Both routes start in the OS onboarding and return to the same hub, map, mentor, and progress
explanation. Track switching preserves local continuity. The host owns navigation, mission
selection, local engagement state, and presentation; embedded engines own mission execution.

The release is explicitly **local-first**, not a public SaaS launch. Browser IndexedDB stores
local continuity on one device. There are no accounts, cloud sync, multi-device continuity,
hosted canonical learner writes, or guarantee of a public browser-only URL in v0.1. Local
completion is not mastery. Only the independent learner gate may write canonical `mastered`
state from eligible evidence.

## Engine classification

Classification controls release work, support promises, navigation, and CI. `primary` means the
learner-facing release shell. `embedded` means required inside that shell but not marketed as a
separate front door. `experimental` remains usable by contributors but cannot block the RC.
`archived` receives no release work.

| Engine/surface | Class | v0.1 role | Owner | RC impact |
| --- | --- | --- | --- | --- |
| `codexdojo-os-prototype` | **primary** | Canonical front door, two-track journey, mission host, local progress | Product host / OS maintainer | Blocking |
| `literacyDojo` | **embedded** | Executes the three IA Prática missions | AI Literacy maintainer | Blocking |
| `voxelDojo` | **embedded** | Executes the three Trilha Dev missions named above | Teaching-games maintainer | Blocking only for the three bound games |
| `shared/teaching-evidence` | **embedded** | Host/evidence protocol used by release-path engines | Learner-platform maintainer | Blocking for used contracts |
| `codexDojo` | **experimental** | Legacy dashboard and `/desktop` contributor/inspection surface | Dashboard maintainer | Non-blocking |
| `dojoToday` | **experimental** | Programmer daily-lesson read-only prototype | Dashboard maintainer | Non-blocking |
| `miniTown` | **experimental** | Explore-only Level 0 concept; not an IA Prática lesson player | Experience prototyping owner | Non-blocking |
| `pixelDojo` | **experimental** | Alternate 2D teaching-game surface | Teaching-games maintainer | Non-blocking |
| `minimaxDojo` | **experimental** | Tutoring core/reference implementation | Tutor-core maintainer | Non-blocking |
| `miniMaxEvolutionEngine` | **experimental** | Contributor orchestration motor | Developer-workflow maintainer | Non-blocking |
| `openclaw` | **experimental** | Simulate-grade checklist runner | Developer-workflow maintainer | Non-blocking |
| `aiDevschoolMvp` | **archived** | Superseded installable-skill prototype | Repository maintainer | Excluded |
| `zai-duolingo-like` | **archived** | Empty/superseded prototype directory | Repository maintainer | Excluded |

`engines/shared/` is infrastructure rather than a standalone learner app, but is listed to remove
ambiguity because its protocol is on the release path. Generated directories such as
`__pycache__` are not engines and have no classification.

## Frozen scorecard

The RC is cut only when every blocking row is green at the same candidate revision. Historical
test counts or deploy configuration do not satisfy a gate.

| Gate | Pass condition | Owner |
| --- | --- | --- |
| Front door | Root route starts onboarding; both tracks reach the shared hub and map | Product host / OS maintainer |
| IA Prática chapter | Exactly the three bound, ready lessons launch through the host and complete the attempt/feedback/retry loop | AI Literacy maintainer |
| Trilha Dev chapter | Exactly WAREHOUSE, WORMHOLE, and RELAY STATION launch through the host and meet their declared completion criteria | Teaching-games maintainer |
| Progress integrity | Refresh and track switching preserve compatible local progress; UI never labels local completion as mastery | Product host / OS maintainer |
| Evidence boundary | Producer evidence is forwarded unchanged; verification and canonical mastery remain separate and fail closed | Learner-platform maintainer |
| Accessibility/recovery | Keyboard path, reduced motion, and renderer fallback work for the six launch missions | Product host + embedded-engine owners |
| Privacy | Analytics is opt-in or disabled by default, schema-allowlisted, anonymous, and contains no learner content, evidence, or checkpoint payloads | Product host / analytics maintainer |
| Release CI | Blocking checks pass for OS, LiteracyDojo, the three bound voxel games, and used shared contracts | Release engineering owner |
| Scope audit | No growth-freeze item entered the candidate and experimental engines cannot fail blocking CI | Product owner |
| Candidate record | Candidate commit, check results, known limitations, and rollback/deploy instructions are recorded together | Release engineering owner |

## Growth freeze and change control

Until `v0.1.0-rc.1` is cut, work is limited to defects, accessibility, privacy, release-path
integration, test reliability, and documentation needed to satisfy the scorecard. New missions,
additional voxel games, miniTown integration, pixelDojo integration, dashboard promotion, tutor
provider expansion, accounts, cloud persistence, cross-device sync, payments, and public deployment
promises are deferred.

An exception requires a written change to this document naming the scorecard gate it protects,
the owner, and what is removed to keep the candidate bounded. Engine-local readiness never
promotes an engine into the release path by itself.

## Release disposition

The target candidate is **`v0.1.0-rc.1`**, cut from one commit after all blocking gates pass.
Experimental and archived surfaces ship only as repository artifacts with no v0.1 support or
availability promise. After the candidate is cut, only release-blocking fixes may enter before
`v0.1.0`; other work moves to the next release.
