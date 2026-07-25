# Context Map

AI DevSchool is one ecosystem with **one learner and one curriculum**, realized through several
bounded contexts. Each context owns its language. When a word appears in two contexts, the
meanings are different — do not collapse them.

Canonical language references live next to the context they describe. Some
generic surfaces use their local README instead of a dedicated glossary. This
map is the index and relationship contract only.

## Contexts

| Context | Entry | Kind | Owns |
| --- | --- | --- | --- |
| [Learner Journey](./learner/CONTEXT.md) | `learner/CONTEXT.md` | Core | Mastery proof, learning-state machine, reviews, streak, profile |
| [Curriculum Catalog](./curriculum/CONTEXT.md) | `curriculum/CONTEXT.md` | Supporting | Challenge catalog, project identities, backlog truth |
| [AI Literacy](./docs/design/ai-literacy/README.md) | `docs/design/ai-literacy/` | Core | Nontechnical lesson content, deterministic activities, local progress and raw evidence |
| [LiteracyDojo](./engines/literacyDojo/README.md) | `engines/literacyDojo/README.md` | Generic | Guided AI microlearning UI; consumes generated content and records at most `completed` |
| [miniTown](./engines/miniTown/README.md) | `engines/miniTown/README.md` | Generic | Explore-only Level 0 town surface; no lesson or mastery authority |
| [Tutoring Roster (Ágora)](./engines/minimaxDojo/CONTEXT.md) | `engines/minimaxDojo/CONTEXT.md` | Core | Named pedagogical roles and the protocol they enact |
| [Polyglot Project Cycle](./engines/miniMaxEvolutionEngine/CONTEXT.md) | `engines/miniMaxEvolutionEngine/CONTEXT.md` | Supporting | 5-phase build loop for one curriculum project |
| [Teaching Game — Pixel](./engines/pixelDojo/CONTEXT.md) | `engines/pixelDojo/CONTEXT.md` | Core | 2D arcade attempt surface and evidence emission |
| [Teaching Game — Voxel](./engines/voxelDojo/CONTEXT.md) | `engines/voxelDojo/CONTEXT.md` | Core | 3D simulation attempt surface and evidence emission |
| [Polyglot Arena](./docs/design/polyglot-arena/CONTEXT.md) | `docs/design/polyglot-arena/CONTEXT.md` | Supporting (nascent) | Pre-benchmark prediction and fairness calibration |
| [Learner Dashboard](./engines/codexDojo/CONTEXT.md) | `engines/codexDojo/CONTEXT.md` | Generic | Read-only presentation of other contexts' state |
| [Checklist Runner](./engines/openclaw/CONTEXT.md) | `engines/openclaw/CONTEXT.md` | Generic | Explicit file-based checklist runner and YAML pipeline adapter |

## Relationships

- **AI Literacy → LiteracyDojo**: publishes canonical lesson YAML through a
  generated, typed read model. LiteracyDojo never edits the source YAML.
- **LiteracyDojo → AI Literacy**: emits `LiteracyEvidenceRecord` attempts and
  keeps experience progress local. `completed` is not `mastered`.
- **LiteracyDojo ↛ Learner Journey**: there is no accepted write adapter into
  `learner/learning_state.yaml`; an independent no-code verifier is still
  required before shared mastery can exist.
- **miniTown ↛ Learner Journey**: miniTown is exploration only. Runtime state
  is inspectable, but it is neither lesson evidence nor a mastery write.
- **Micro-lesson contract → learner surfaces**: defines the shared pedagogical
  lifecycle without merging the AI Literacy and teaching-game schemas.
- **Teaching Game (Pixel / Voxel) → Learner Journey**: games emit **Executable Evidence**; only the
  **Verifier** (Prometor role) may advance learning state. Games never mark **Mastered**.
- **Learner Journey → Teaching Game (Pixel / Voxel)**: publishes a read-only **Review Slice**
  (which unit is due, streak). Scheduling truth flows one way.
- **Learner Journey → Learner Dashboard**: publishes a **Learner Snapshot** (and related derived
  views). Dashboard is a conformist consumer — it does not invent mastery.
- **Curriculum Catalog → Learner Journey**: supplies **Project** / **Unit** identities and
  **Diagnostics** that the learning gate challenges against.
- **Curriculum Catalog → Polyglot Project Cycle**: cycle work targets one catalog **Project** and
  writes **Artifacts** under it.
- **Tutoring Roster → Learner Journey + Polyglot Project Cycle**: the roster is the actor model
  that runs both loops (diagnose, tutor, verify, schedule, govern). Same protocol on two
  platforms (minimaxDojo spec + miniMaxEvolutionEngine motor).
- **Polyglot Arena → Polyglot Project Cycle**: arena calibration sits on top of benchmark
  **Artifacts**.
- **Polyglot Arena ↔ Learner Journey**: predictions are about the learner's calibration; the
  write boundary into learner state is still under discipline (must not bypass the journey's
  single writer).
- **Checklist Runner → Polyglot Project Cycle**: OpenClaw previews or executes explicit checklist
  phases against `learner/pipeline_status.yaml`; it has no background daemon or event bus.

## Language collisions (do not merge)

| Word | In Learner Journey | Elsewhere |
| --- | --- | --- |
| **Gate** | **Learning Gate** (blocks AI until attempt evaluated) or **Empirical Gate** (numeric mastery bar) | Project-cycle transition checks; not the same object |
| **Phase / state** | **Learning State**: presenting → practicing → evaluating → mastered | **Project Phase**: spec → impl → review → benchmark → cycle-complete |
| **Unit** | **Active Unit** / logged unit of learning under the gate | Curriculum **Project** slice or game level — clarify before using |
| **Completed** | Not a canonical Learner Journey mastery state | Local experience progress in LiteracyDojo; never promote it implicitly |
| **Verifier / Prometor** | Role that alone may pass the empirical bar and record mastery | Same role name in the project cycle, different artifact under test |
| **Evidence** | **Executable Evidence** justifying mastery | Game **Evidence Record** is raw input; verifier re-judges it |

## Out of glossary scope

Implementation seams (file paths, generators, config markers, adapter names) belong in
`docs/handbook/`, `AGENTS.md`, and engine docs — not in any `CONTEXT.md`.
