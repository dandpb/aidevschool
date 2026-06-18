# {Project Name} — Specification

> **Project ID:** {NN_slug}
> **Level:** {1-6}
> **Status:** spec-in-progress

## Overview

{2-3 paragraphs explaining what we're building and why it's educational}

## Learning Objectives

- Primary concept: {the one thing this project teaches}
- Secondary concepts: {supporting skills}

## Functional Requirements

- **RF-001:** {requirement, testable}
- **RF-002:** {requirement, testable}
- **RF-003:** {requirement, testable}
- ... (5-15 requirements typical)

## Non-Functional Requirements

- **RNF-001:** {performance/quality requirement with metric}
  - e.g., "Latency p95 < Xms under Y RPS"
- **RNF-002:** {requirement}
- ... (5-10 requirements typical)

## API / Interface Contract

### Endpoints

```
METHOD /path → {description}
  Request: {schema}
  Response: {schema}
  Errors: {codes and meanings}
```

### Data Models

```
EntityName:
  field: type (constraints)
```

## Architecture

### Diagram

```mermaid
{C4 or flowchart diagram}
```

### Components

| Component | Responsibility |
|-----------|---------------|
| {name} | {what it does} |

### Design Decisions

| Decision | Alternatives | Justification |
|----------|-------------|---------------|
| {choice} | {what was considered} | {why this won} |

## Error Handling Strategy

- {How errors are categorized, propagated, and recovered}
- {HTTP status codes mapping}
- {Idempotency guarantees}

## Edge Cases

- Empty input → {expected behavior}
- Maximum input → {expected behavior}
- Concurrent access → {expected behavior}
- Timeout → {expected behavior}
- {Domain-specific edge cases}

## Acceptance Criteria

For each functional requirement:
- RF-001: {how to verify it passes}
- RF-002: {how to verify it passes}

## Language-Specific Notes

### Go
- {idiomatic approach, recommended packages}
### Rust
- {idiomatic approach, recommended crates}
### Node/TS
- {idiomatic approach, recommended packages}

## Dependencies

- Prerequisite projects: {which projects must be done first}
- External tools: {k6, Docker, etc.}
