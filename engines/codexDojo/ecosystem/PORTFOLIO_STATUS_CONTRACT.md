# AiDevSchool Portfolio Status Contract

**Effective:** 2026-08-04  
**Owner:** CEO  
**Review owner:** Founding Product Engineer  
**Review cadence:** at each public-release boundary, or when an initiative changes authority

## Purpose

This contract defines how every engine participates in one learner product. It is the normative
portfolio boundary for roadmap, navigation, claims, and writes. Runtime and learner-state contracts
remain authoritative for their own schemas; when a portfolio label conflicts with implementation,
the implementation must be corrected or this contract must be explicitly revised.

The invariant is **one learner, one curriculum, many engines**. Engines may own presentation,
interaction, or orchestration inside their bounded context. They do not acquire curriculum,
evidence-verification, or mastery authority by being runnable or integrated into the OS.

## Status vocabulary

| Status | Portfolio meaning | Investment rule |
| --- | --- | --- |
| `learner-facing` | Part of the primary, coherent learner journey. | May receive product experiments and release work within its declared scope. |
| `supporting` | Required secondary capability or bounded teaching surface. | Maintain and improve only against a named learner journey or shared contract. |
| `internal` | Contributor, tutor-core, orchestration, or verification infrastructure. | Reliability and contract work only; do not market as a separate learner product. |
| `incubating` | A learner hypothesis that is not part of the primary journey. | Requires a named owner, measurable hypothesis, time box, and review date before expansion. |
| `archived` | Proposal, historical exploration, or superseded surface. | No roadmap work; revive only through an explicit portfolio decision. |

These labels describe portfolio posture, not release readiness. `implemented`, `ready`, `local`,
`live`, `completed`, and `mastered` retain the meanings in `MANIFEST.md`. In particular, neither
`learner-facing` nor a green build implies public availability, learning effectiveness, or mastery.

## Portfolio registry

| Initiative | Status | Bounded role and authority | Prohibited writes or claims |
| --- | --- | --- | --- |
| `engines/codexdojo-os-prototype/` | `learner-facing` | The only primary learner entry and mission host. Owns local onboarding, navigation, engagement state, and opaque local checkpoints. Reads the generated learner snapshot. | Must not write canonical curriculum, learner state, evidence verdicts, or mastery. Must not present local completion, XP, or verification transport as mastery. |
| `engines/literacyDojo/` + `curriculum/ai-literacy/` | `learner-facing` | Runs the first nontechnical lesson loop. Canonical lesson content is owned by `curriculum/ai-literacy/`; the engine owns its local interaction and progress through `completed`. | The engine must not hand-edit generated content, write canonical learner state, self-verify, or mark `mastered`. Content status `ready` is not app or learner readiness. |
| `engines/voxelDojo/` | `supporting` | Owns 3D simulations and producer-side raw teaching evidence. First-release product work is limited to missions explicitly bound by the OS catalog; the remaining games are a maintained catalog. | Must not own mission order, canonical curriculum, verifier selection/verdicts, learner state, or mastery. Catalog breadth is not launch breadth or proven learning value. |
| `engines/pixelDojo/` | `supporting` | Owns 2D teaching mechanics and producer-side raw evidence where that format is selected for a curriculum concept. | Must not duplicate Voxel coverage merely to expand the roadmap, write canonical learner state, verify its own output, or mark mastery. |
| `engines/codexDojo/` | `internal` | Contributor/engineering dashboard and product-facing ecosystem documentation. | Must not become a second primary learner entry or own canonical learner state; generated projections are read-only. |
| `engines/minimaxDojo/` | `internal` | Deep tutor-core R&D and reference contracts. Numeric tutor thresholds remain in `config/learner.yaml`. | Must not be marketed as a separate learner product without a bounded, measured outcome; must not bypass attempt-before-solution or independent verification. |
| `engines/miniMaxEvolutionEngine/` | `internal` | Supervised curriculum-production and engineering orchestration. | Must not represent phase completion as learner mastery or allow a producer to approve its own artifacts. |
| `engines/openclaw/` | `internal` | File-based simulate-grade checklist runner and reliability harness. | Must not be described as an autonomous learner product, event bus, or mastery authority. |
| `engines/miniTown/` | `incubating` | Explore-only Level 0 onboarding hypothesis. It may be evaluated for onboarding completion or comprehension without joining the assessed lesson lifecycle. | Must not write learner state, emit mastery, or become primary navigation until an owner, metric, time box, and review decision are recorded. |
| `docs/design/polyglot-arena/` and superseded/legacy design surfaces | `archived` | Historical and proposal-stage reference material. Runnable comparison seams remain in shared curriculum tooling. | Must not be presented as implemented, learner-facing, or roadmap-active without a new approved portfolio decision. |

### Curriculum and substrate registry

| Surface | Status | Audience and owner | Authority and writes | Operational gate and review condition |
| --- | --- | --- | --- | --- |
| `curriculum/ai-literacy/` | `learner-facing` | IA na Prática learners; Curriculum owner | Canonical AI Literacy content and prerequisites. Authoring tools may change canonical YAML; engines only consume generated views. | Content validator and its unit tests; review when lessons, schema, or release bindings change. |
| `curriculum/00_ai_in_practice/` | `supporting` | Nontechnical Level 0 learners; Curriculum owner | Canonical Level 0 challenge and ADR-0004 evidence requirements. It does not give miniTown assessment authority. | Declared no-code verification checklist; review when a Level 0 activity becomes assessed or host-bound. |
| `curriculum/01_*`–`18_*` and `curriculum/catalog.md` | `supporting` | Developer learners; Curriculum owner | Canonical programming sequence, project status, and executable evidence. Project producers write attempts/artifacts, not accepted verdicts or mastery. | Owning project suite plus independent evidence review; review when a project is certified, host-bound, or publicly claimed. |
| `learner/`, `learner/substrate/`, and `learner/gate/` | `supporting` | Both learner tracks; Learner substrate owner | Exclusive canonical learner-state and mastery-transition authority. May generate projections after canonical writes; consumers never edit those projections. | `make test-substrate` and the gate-appropriate independent verifier; review on schema, gate, projection, or mastery-policy changes. |

## Accountability and operational gates

The CEO owns portfolio posture. The named owner below owns bounded delivery and must trigger the
review condition; a different reviewer accepts completion-sensitive evidence.

| Initiative(s) | Primary audience | Delivery owner | Smallest operational gate | Review condition |
| --- | --- | --- | --- | --- |
| codexDojo OS | Both learner tracks | Founding Product Engineer | OS lint, unit tests, build, and affected smoke journey | Root journey, mission binding, authority, or public-release boundary changes |
| LiteracyDojo | Nontechnical learners | LiteracyDojo engine owner | Content generation, lint, unit tests, build, and affected E2E | Lesson lifecycle, evidence schema, or public route changes |
| voxelDojo | Developer learners | Voxel engine owner | Catalog or affected-package lint, test, typecheck, build, and smoke | A game is added to the OS journey or makes a learning claim |
| pixelDojo | Developer learners | Pixel engine owner | Lint, test, typecheck, build, and smoke | A mechanic is selected for a host-bound concept or overlaps Voxel coverage |
| codexDojo dashboard | Contributors | codexDojo engine owner | Lint, test, and build | Dashboard role, generated data, or navigation changes |
| minimaxDojo | Developer learners indirectly; tutor researchers | Tutor-core owner | `make test-core` | A tutor behavior or threshold affects a learner-facing flow |
| miniMaxEvolutionEngine | Internal curriculum/engineering operators | Evolution-engine owner | Owning command/adapter contract checks | Phase authority, producer/verifier separation, or learner integration changes |
| openclaw | Internal engineering operators | OpenClaw owner | `python3 -m pytest engines/openclaw/tests/` | Checklist semantics or substrate integration changes |
| miniTown | Prospective nontechnical learners | Named experiment owner (required before a run) | Lint, test, typecheck, build, and smoke | Hypothesis start/end, primary-navigation proposal, or any assessed behavior |
| Archived designs | Contributors/researchers | No active owner | Not applicable while archived | Revival proposal names an owner, audience, gate, metric, and exit criterion |

## Shared authorities

Portfolio status never changes these ownership boundaries:

| Concern | Authority | All other surfaces |
| --- | --- | --- |
| Curriculum and prerequisites | `curriculum/` | Reference or render; do not fork or shadow the source. |
| Canonical learner state | `learner/` | Read generated projections; never hand-edit `.mavis/` or generated engine views. |
| Mastery transition | `learner/gate/` through the substrate's public gate operation | Submit eligible attempt plus independently accepted evidence; never write mastery directly. |
| Teaching-evidence transport contract | `engines/shared/teaching-evidence/` and the owning cross-engine contract | Produce or transport unchanged evidence; producers do not verify themselves. |
| Primary mission bindings and learner navigation | `engines/codexdojo-os-prototype/` | Engines execute the bounded activity; they do not redefine host ordering or eligibility. |
| Product-facing portfolio contract | This file, mapped by `MANIFEST.md` | Propose changes through an explicit portfolio review. |

## Change and promotion gate

Changing an initiative's status requires all of the following in the same decision record:

1. a named audience, job-to-be-done, owner, and bounded authority;
2. an operational receipt from the smallest owning-surface suite;
3. gate-appropriate learner evidence, with an attempt before evaluation and a producer separate
   from the verifier;
4. for promotion to `learner-facing`, observed product evidence and a defined rollback boundary;
5. updated public/catalog claims and this contract plus `MANIFEST.md`.

An incubating initiative additionally requires a falsifiable metric, a time box, and a review date.
An unowned or expired incubation freezes by default. A green build alone can justify
`implemented`; it cannot justify `learner-facing`, `live`, effective learning, or `mastered`.

## Current decision consequences

- Product navigation and launch messaging lead with codexDojo OS, with LiteracyDojo activities and
  explicitly bound developer simulations behind it.
- Pixel and Voxel overlap is resolved by measured comprehension or transfer for a named concept,
  not by maintaining parallel roadmap coverage.
- miniTown remains outside the assessed micro-lesson lifecycle until its onboarding hypothesis is
  owned and tested.
- Tutor and orchestration engines remain internal until a bounded learner outcome earns a new
  portfolio decision.
- The programming catalog distinguishes certified implementations, pilot simulations, scaffolds,
  and proposals; catalog size is never used as a release or learning-effectiveness claim.
