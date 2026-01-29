# Backlog

## To implement before public deployment

- Copy issues and feeds, including their custom relevance evaluation prompts
- Copy existing stories

- Implement security plans
- GitHub flagged 2 moderate Dependabot vulnerabilities on the repo — worth checking at https://github.com/OdinMB/actually-relevant/security/dependabot.
- **Server job queue system** — Server-side queue with concurrency limits to prevent OpenAI rate limit issues; client fires requests and shows progress indicators (e.g. "3/20 assessed") without blocking the UI, allowing the user to navigate and do other work while batch jobs run in the background
- **Optimize prompts** now that we're in the gpt-5.2 era
- Test bulk actions via admin panel
- Automate final selection of articles
- Article UI: link to original source at the top; show source in preview card, emotion only in emotion mode, render md (from LLM), don't show keywords
- Improve overall site design
- **Automated publishing schedule** — Auto-publish selected stories on a schedule (e.g., daily digest)

## After public deployment

- **Syntactic Search**
- **RSS feed output** — Generate custom RSS feeds for published stories (by issue, all, etc.)
- Try generating "Symbolbilder" for published articles

- Simplify rating_low / rating_high to just rating?

- **Social media auto-posting** — Auto-post published stories to Twitter/LinkedIn/Mastodon
- **Semantic search** — pgvector infrastructure is in place; build search UI and query endpoint for similarity search over story content/embeddings
- **Story deduplication** — Detect and merge duplicate stories across different feeds covering the same event

- **Public user accounts** — Allow users to create accounts, save preferences, follow topics
- **Reader comments / feedback** — Allow public feedback
- **Data export** — Export stories, analyses, newsletters as CSV/JSON
