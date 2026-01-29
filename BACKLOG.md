# Backlog

## Migration

- Copy issues and feeds, including their custom relevance evaluation prompts
- Copy existing stories

## To implement before public deployment

- **LLM job queue system** — Server-side queue with concurrency limits to prevent OpenAI rate limit issues; client fires requests and shows progress indicators (e.g. "3/20 assessed") without blocking the UI, allowing the user to navigate and do other work while batch jobs run in the background
- **Optimize prompts** now that we're in the gpt-5.2 era
- **Automated publishing schedule** — Auto-publish selected stories on a schedule (e.g., daily digest)
- **Search function** - syntactic first is OK

## After public deployment

- **Email newsletter delivery** — v1 generates newsletters; add actual email sending (SendGrid/Resend)
- **Podcast audio generation** — v1 generates scripts; add text-to-speech for actual audio files
- **RSS feed output** — Generate custom RSS feeds for published stories (by issue, all, etc.)

- **Social media auto-posting** — Auto-post published stories to Twitter/LinkedIn/Mastodon
- **Semantic search** — pgvector infrastructure is in place; build search UI and query endpoint for similarity search over story content/embeddings
- **Story deduplication** — Detect and merge duplicate stories across different feeds covering the same event

- **Public user accounts** — Allow users to create accounts, save preferences, follow topics
- **Reader comments / feedback** — Allow public feedback
- **Data export** — Export stories, analyses, newsletters as CSV/JSON
