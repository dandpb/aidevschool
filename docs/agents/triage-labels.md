# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual strings used in this repo's issue tracker.

| Role in mattpocock/skills | `Status:` line (local markdown) | GitHub label (mirror) | Meaning |
| --- | --- | --- | --- |
| `needs-triage` | `Status: needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `Status: needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `Status: ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent |
| `ready-for-human` | `Status: ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `Status: wontfix` | `wontfix` | Will not be actioned |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), write/update the `Status:` line in the local markdown file. If a GitHub mirror exists, also apply the matching label via `gh issue edit --add-label`.

The five role strings match the canonical names from mattpocock/skills. Override either column to match vocabulary you actually use.
