# Backlog

## To implement before public deployment

- Test cron jobs

- Put this right before the </body> tag everywhere:
<!-- 100% privacy-first analytics -->
<script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>

- Feed filter in stories overview: move inactive/hidden feeds to the bottom of the dropdown list

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

- After deployment, confirm Simple Analytics at https://dashboard.simpleanalytics.com/install?hostname=actuallyrelevant.news
- Download full Flywheel backup to desktop PC
- Cancel Flywheel subscription