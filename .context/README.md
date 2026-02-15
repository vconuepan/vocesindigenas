# Context (`.context/`)

Implementation reference docs for building, modifying, and operating each subsystem.

## Purpose

Context files explain **how the system is built** -- file locations, API endpoints, configuration, workflows, troubleshooting, and modification guides. They are the practical companion to the codebase.

A context file answers: "How do I work with this?" Not "What should it do?"

## Boundary Rules

- **Include:** File paths, API endpoints, environment variables, CLI commands, database schema details, framework patterns, UI component structure, modification guides, operational runbooks
- **Exclude:** Behavioral rules, state transition logic, invariants, entity definitions (these belong in `.specs/`)

Brief summaries of behavioral rules are acceptable when they provide context for the implementation details that follow, but the spec is always the authoritative source for behavior.

## Conventions

- Filename matches the subsystem: `authentication.md`, `story-pipeline.md`
- Files with a spec counterpart start with a cross-reference header pointing to the authoritative spec
- "Key Files" or "File Locations" table at the end
- "Modifying" section when the subsystem has non-obvious change points

## Relationship to `.specs/`

When a topic has both a spec and a context file, the spec defines the **contract** (what must be true) and the context explains the **implementation** (how it's achieved). If they conflict, update the context to match the spec. Some topics exist only in `.context/` because they are purely operational (migrations, logging) or frontend-specific (admin-dashboard, accessibility).
