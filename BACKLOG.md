# Backlog

## To implement before public deployment

- Improve fetching. Get full articles. API? Fancy crawler?
- Assess: identify which issue to use dynamically for each story (instead of hard link story -> feed -> issue)
- Test cron jobs
- Define gpt-5-nano as the small model. Currently used by podcast and preassessments. Switch those to medium. small useful for anything?

- when shutting down the dev server with Ctrl+C:
PS D:\projects\actually-relevant\server>
[Verarbeitung des Prozesses mit Code 2 (0x00000002) beendet]
Sie können dieses Terminal jetzt mit STRG+D schließen oder zum Neustart die EINGABETASTE drücken.

## After public deployment

- **Syntactic Search**
- Emotion mode

- Try generating "Symbolbilder" for published articles
- **Social media auto-posting** — Auto-post published stories to Twitter/LinkedIn/Mastodon
- **Semantic search** — pgvector infrastructure is in place; build search UI and query endpoint for similarity search over story content/embeddings
- **Story deduplication** — Detect and merge duplicate stories across different feeds covering the same event

- **Public user accounts** — Allow users to create accounts, save preferences, follow topics
- **Reader comments / feedback** — Allow public feedback
- **Data export** — Export stories, analyses, newsletters as CSV/JSON

## Orga

- Download full Flywheel backup to desktop PC