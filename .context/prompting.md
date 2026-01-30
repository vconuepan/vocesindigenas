# Prompt Design (GPT-5 Optimized)

Prompts are optimized for GPT-5/5.2 reasoning models based on OpenAI's official prompting guides. Read this before modifying any prompt in `server/src/prompts/`.

## Structure

Each prompt follows Role + Goal + Constraints:

1. `<ROLE>` — Who the model is (e.g., relevance analyst, editorial curator)
2. `<GOAL>` — What to produce, with key constraints inline (e.g., conservatism threshold)
3. Constraint sections — XML-tagged blocks for guidelines, requirements, criteria

## Key Principles

**Declarative over procedural.** Content requirements describe *what* the output should contain, not step-by-step procedures. The model's internal reasoning determines the analysis path. Do not add procedural instructions like "First do X, then do Y."

**No legacy CoT triggers.** GPT-5 reasoning models handle chain-of-thought internally. Never add:
- "Think step by step"
- "Take a deep breath"
- "Follow this prompt exactly as written"
- "Go through the steps one by one"

These waste reasoning tokens and can degrade performance.

**XML scaffolding for constraint sections.** Use XML tags for distinct rule blocks:
- `<ANALYSIS_REQUIREMENTS>` — field-by-field content expectations
- `<SELECTION_CRITERIA>` — evaluation criteria for selection
- `<GUIDELINES>` — cross-cutting rules
- `<GENERIC_LIMITING_FACTORS>` — common reasons that reduce relevance

**Concrete length constraints.** Always specify exact counts and word limits rather than vague quality directives:
- Good: "exactly 4 bullet points, each 2-4 sentences"
- Bad: "incredibly detailed bullet points"

**Schema carries format guidance.** Markdown formatting, field structure, and enum definitions belong in the Zod `.describe()` annotations in `server/src/schemas/llm.ts`, not duplicated in prompts. If format instructions appear in both places, the model may waste reasoning tokens reconciling contradictions.

**No contradictions.** GPT-5 models spend reasoning tokens trying to reconcile conflicting instructions rather than ignoring one. If the schema says one thing and the prompt says another, fix the conflict.

## What to Keep in Prompts

- Content quality guidance (good/bad examples for summaries, titles, quotes)
- Domain knowledge (generic limiting factors, what constitutes sensationalist language)
- Evaluation criteria and scoring methodology
- Issue-specific guidelines injected from the database

## What Belongs in the Schema

- Output field formats (Markdown, plain text, date format)
- Field-level constraints (word counts, character limits, enum definitions)
- Structural guidance (bold labels, bullet format patterns)

## References

- [GPT-5 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)
- [GPT-5.2 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5-2_prompting_guide)
- [Reasoning Best Practices](https://platform.openai.com/docs/guides/reasoning-best-practices)
