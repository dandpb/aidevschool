# Event Bus / Runner

File-based continuous runner and event bus for automated cycle work. Incubating as an integration
layer until other contexts are real subscribers.

## Language

**Runner**:
The process that advances cycle work from events without a human driving each step.
_Avoid_: cron, CI pipeline (related but not this context's name)

**Hermes**:
The file-based bus that carries cycle events between producers and consumers.
_Avoid_: message broker product name-drop, Kafka

**Event**:
A durable bus message about cycle work (topic, cycle identity, artifact reference, payload).
_Avoid_: log line, domain event from Learner Journey (different stream)

**Topic**:
The event kind namespace for cycle automation.
_Avoid_: chat topic, forum thread

**Dedup Key**:
Identity used to treat equivalent events as one so retries stay idempotent.
_Avoid_: primary key, content hash alone without the bus rule

**Conflict**:
Detected clash or duplicate classification when event identity rules disagree.
_Avoid_: merge conflict (git), race only
