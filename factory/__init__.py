"""Agentic factory POC — AiDevSchool (AID-2676).

Implements the station pipeline proposed in the attached HTML
(`agentic-factory-poc-aidevschool.export.html`):

    Event -> Contract -> Build -> Prove -> PR+CI -> (human direction)

One canonical versioned registry (`intent/<change-id>/`) plus local,
git-ignored runtime state (`.scratch/factory/<run-id>/`). Every station
transition appends a hash-chained receipt to the run ledger; a promotion
only happens when every gate rule holds at the same SHA. See
`factory/README.md` for the station map and the P1–P5 exit criteria.
"""

__all__ = ["model", "ledger", "queue", "contract", "gitwork", "verify", "gate", "coordinator"]
