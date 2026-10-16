# minimaxDojo local entry — source and execution finding

HEAD: `528a56c847ec50276ed9d2dab2c7247584c567c3`. Human steering: “use a aplicacao localmente”. C24 remains unchanged.

The real existing local entry is `python3 -m engines.minimaxDojo.os_adapter` from the repository root. The OS Engine Hub exposes the same bounded action through “Preparar sessão de tutoria”. This prepares a source-labelled Socratic briefing. It does not instantiate the 14-agent tutor cycle or write canonical progress.

The CLI was executed against an exact private snapshot of current source/config/learning state. Exit 0; correct mastered-unit branch asks Cartografo to present the next unit; authority disclaimer present. All 313 compared source learner/engine files remained byte-identical. See `probe.json`, stdout/stderr and source-copy manifest. An initial observer incorrectly expected the practicing branch while the exact input is mastered; it is retained as `probe-v1-observer-assumption.json`, then corrected without changing source or criteria.

Three existing focused tests passed: the read-only adapter contract, reference verifier-pass transition/audit contract, and reference fail/retry/block contract. They supply empirical metrics and temporary state and therefore prove reference contracts, not a tutor/model execution.

| Frozen phase | Existing local surface | Evidence limit |
| --- | --- | --- |
| Bootstrap → Sonda → Cartografo | Prompt documents | No local coordinator/launcher in this engine |
| Learner attempt | Adapter checks attempt-file presence | No local submission or assessment loop |
| Prometor and Crítico in fresh contexts | Prompts plus reference events | No local role runtime invoked |
| Report, whiteboard, reflection | Templates, derived snapshots, EventStore API | No live cycle output or reflection evaluation |
| Maestro error/retry/resume | Reference state-machine contracts | Tests do not execute real agents |

Relevant source: `engines/minimaxDojo/AGENTS.md` says reference code/contract suite and engine is not the runnable dashboard; `core/README.md:17–20` says Python is the executable spec/test oracle, not a server. `docs/QUICK_START.md:25–31` and `README.md:161` still require the MiniMax Agent Team. OS bridge allowlist `engines/codexdojo-os-prototype/bridge/actions.ts:25–32` runs the local adapter. The web static evaluation explicitly states it does not execute the Python motor.

Faithful local scope proposal: exercise this existing adapter via CLI and actual OS bridge, with normal/mastered/missing-input branches, source identity and no writes. Keep the full bootstrap/isolated-agents/report/reflection/retry obligation unverified unless the owner accepts that narrower declared use or authorizes implementing a local tutor runtime. The user's environment preference alone does not make a contract demo a full tutoring cycle.

No source or checklist edit, browser launch, model call, credential read, external write, state advance or generic process enumeration occurred. Every owned subprocess exited; no server remains.
