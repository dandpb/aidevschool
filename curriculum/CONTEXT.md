# Curriculum Catalog

The shared catalog of challenges every engine points at. One curriculum for the whole ecosystem;
engines reference it, never duplicate it.

## Language

**Catalog**:
The ordered set of projects the school offers — identity, level, dependencies, and status.
_Avoid_: roadmap (roadmap is a presentation of catalog truth), syllabus (too academic)

**Project**:
One polyglot challenge in the catalog (named unit of curriculum work with its own folder and
deliverables).
_Avoid_: repo, exercise alone, module (when you mean a full challenge)

**Slug**:
Stable string identity of a Project used across engines and evidence.
_Avoid_: title, display name, path (path is storage, not identity)

**Level**:
Difficulty band of a Project in the catalog progression.
_Avoid_: grade, Dreyfus stage (Dreyfus lives on the Learner Profile)

**Dependency**:
A Project that must be respected before another is unlocked on the trail.
_Avoid_: import, package dependency

**Concept**:
A single idea a Project (or a teaching game) is meant to teach.
_Avoid_: topic (looser), skill (belongs to learner profile)

**Deliverable**:
A required artifact shape for a Project (spec, implementations, review, benchmarks, evolution
notes).
_Avoid_: file, output, PR

**Backlog Status**:
Ground-truth progress of a Project in the catalog when status fields disagree.
_Avoid_: git status, board column

**Polyglot**:
Implemented in the school's required languages from one shared Project specification.
_Avoid_: multi-language (vague), translated
