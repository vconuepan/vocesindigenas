# Backlog

## To implement before public deployment

- List of sources: dynamic from db instead of hard-coded in settings of issues

9. Source favicon/logo.
  Display a small favicon or text badge for the source publication (Heise, Al
   Jazeera, allAfrica, etc.). This adds visual variety since different
  sources have different branding. You could fetch favicons from
  https://www.google.com/s2/favicons?domain=... or keep a small local sprite.

Split admin stuff from stuff that a regular user needs?
Task Output b2f06ed
  ⎿ (!) Some chunks are larger than 500 kB after minification. Consider:
    - Using dynamic import() to code-split the application
    - Use build.rollupOptions.output.manualChunks to improve chunking:


- Set up and test cron jobs

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