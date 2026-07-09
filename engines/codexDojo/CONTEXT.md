# Learner Dashboard

Read-only product surface that shows journey, roster, cycle, and catalog state. It presents;
it does not decide mastery.

## Language

**Dashboard**:
The learner-facing control surface for inspecting ecosystem state.
_Avoid_: admin panel, IDE, tutor itself

**Learner Snapshot**:
The read model of Learner Journey state the Dashboard renders. Derived, not authored here.
_Avoid_: live database row, editable form model

**View**:
One named screen or panel on the Dashboard (overview, learner, agents, cycle, and so on).
_Avoid_: route only, page (when you mean the conceptual panel)

**Ecosystem Status**:
Aggregated health/progress presentation across engines and substrate — still not a write path.
_Avoid_: monitoring suite, PagerDuty
