# Specs (`.specs/`)

Behavioral specifications for each domain subsystem, written in [Allium](https://github.com/allium-lang).

## Purpose

Specs define **what the system guarantees** -- entities, state machines, transition rules, invariants, and actor surfaces. They are the authoritative source for domain behavior.

A spec answers: "What must be true?" Not "How is it built?"

## Boundary Rules

- **Include:** Entity definitions, status transitions, validation rules, config thresholds, actor/surface declarations, cross-spec imports
- **Exclude:** File paths, CLI commands, environment variables, UI patterns, framework choices, operational runbooks

## Conventions

- Filename matches the domain: `story-pipeline.allium`, not `stories.allium`
- Header comment names the source files the spec was distilled from
- Cross-spec dependencies use `use "./other.allium" as alias`
- `external entity` for entities owned by another spec
- `deferred` for behaviors documented elsewhere (implementation-specific)
- `guidance:` blocks in surfaces may reference implementation details -- this is acceptable as hints, not contracts

## Relationship to `.context/`

When a topic has both a spec and a context file, the spec is the **contract** and the context is the **implementation reference**. If they conflict, the spec is authoritative and the context should be updated. Context files with a spec counterpart include a cross-reference header.
