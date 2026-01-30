export interface MySqlFeed {
  id: number;
  issue_id: number | null;
  title: string;
  description: string;
  url: string;
  active: number;
  comment: string;
  interval_hours: number;
  last_crawled: string | null;
  content_container: string;
  language: string;
}

export interface MySqlIssue {
  id: number;
  category_id: number;
  name: string;
  description: string;
  factors: string;
  antifactors: string;
  ratings: string;
}

export interface MySqlStory {
  id: number;
  feed_id: number | null;
  issue_id: number | null;
  post_id: number;
  date_published: string | null;
  url: string;
  date_crawled: string | null;
  title: string;
  content: string;
  relevance_rating_low: number | null;
  relevance_rating_high: number | null;
  emotion_tag: string;
  ai_response: string;
}

export interface MySqlNewsletter {
  id: number;
  title: string;
  post_ids: string;
  content: string;
  date_published: string;
  url: string;
  twitter: string;
}

export interface MySqlPodcast {
  id: number;
  title: string;
  post_ids: string;
  content: string;
  date_published: string;
  url: string;
}

export interface ParsedAiResponse {
  summary: string | null;
  conservativeRating: number | null;
  speculativeRating: number | null;
  reasons: string | null;
  scenarios: string | null;
  relevanceSummary: string | null;
  relevanceTitle: string | null;
}

export interface MigrationStats {
  issues: { created: number; updated: number; skipped: number };
  feeds: { created: number; updated: number; skipped: number };
  stories: { created: number; updated: number; skipped: number; errors: number };
  newsletters: { created: number; updated: number; skipped: number };
  podcasts: { created: number; updated: number; skipped: number };
  warnings: string[];
}
