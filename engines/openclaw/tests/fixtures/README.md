# openclaw test fixtures

## pipeline_status.seed.{md,yaml}

Immutable seed for `test_scheduler.py` (hardening-top10 item R5, AID-1626).

Frozen byte-identical copy of the learner pipeline status at pin `4cb48e1b`
(PR #369 merge, 2026-09-13):

| Seed | Source at pin | sha256 |
| --- | --- | --- |
| `pipeline_status.seed.md` | `learner/pipeline_status.md` | `a8fcbcb603f68ddd03ac7f3e6742c5580dae6194b11bd112206a7d7033188b54` |
| `pipeline_status.seed.yaml` | `learner/pipeline_status.yaml` | `668ac80145de042c0bd78dd4210ceccf1dc0ad932770eb4a03f2fd6d886f169a` |

`load_status()` resolves the `.yaml` sibling of the path it receives, so tests
point at the `.md` seed (same call shape as the production path) and parse the
seed YAML. The `.md` copy is kept as the frozen narrative twin.

## Policy

- **Never regenerate or refresh these files.** They are deliberately frozen.
  Tests must not depend on the live `learner/pipeline_status.*`: a concurrent
  `python3 -m learner.substrate` run or a real phase/project advance by the
  learner changes the parsed content underneath the suite (flake risk), and
  CWD-relative reads of the live file break when pytest runs from another
  directory.
- Scheduler tests derive every scenario field they assert on (`phase`,
  `current_project`, `blockers`) from this seed, not from live learner state.
- `test_cli_preview.py` is out of this policy: it is a read-only contract test
  of the canonical-path preview and byte-compares the live files before/after.
- If the schema consumed by `load_status()` ever changes shape, add a NEW
  versioned seed (e.g. `pipeline_status.seed.v2.yaml`) instead of editing this
  one, and pin the switch in the tests.
