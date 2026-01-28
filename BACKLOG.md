# Backlog — Actually Relevant

Features and ideas to implement after v1.

---

## Deferred Features

- **RSS feed output** — Generate custom RSS feeds for published stories (by issue, all, etc.)
- **Semantic search** — pgvector infrastructure is in place; build search UI and query endpoint for similarity search over story content/embeddings
- **Public user accounts** — Allow users to create accounts, save preferences, follow topics
- **Email newsletter delivery** — v1 generates newsletters; add actual email sending (SendGrid/Resend)
- **Podcast audio generation** — v1 generates scripts; add text-to-speech for actual audio files
- **Automated publishing schedule** — Auto-publish selected stories on a schedule (e.g., daily digest)
- **Analytics and engagement tracking** — Track page views, popular stories, reading patterns
- **Social media auto-posting** — Auto-post published stories to Twitter/LinkedIn/Mastodon
- **Multi-language content support** — Full i18n beyond simple language tagging on feeds
- **Profile embeddings / "find fellows"** — Port the RelevanceSpider embedding-based professional matching feature
- **Story deduplication** — Detect and merge duplicate stories across different feeds covering the same event
- **Source credibility scoring** — Track feed reliability over time
- **Reader comments / feedback** — Allow public feedback on relevance assessments
- **API rate limiting per user** — When public user accounts exist, per-user rate limits
- **Webhook notifications** — Notify external systems when stories are published
- **Data export** — Export stories, analyses, newsletters as CSV/JSON
