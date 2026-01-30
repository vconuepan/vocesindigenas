import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient, StoryStatus, EmotionTag, ContentStatus } from '@prisma/client';
import { parseMySqlDump } from './parse-sql.js';
import { parseAiResponse } from './parse-ai-response.js';
import { OLD_ISSUE_ID_TO_SLUG, CONSOLIDATED_ISSUES } from './issue-mapping.js';
import type {
  MySqlFeed,
  MySqlIssue,
  MySqlStory,
  MySqlNewsletter,
  MySqlPodcast,
  MigrationStats,
} from './types.js';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SMALL_FILE = path.resolve(
  __dirname,
  '../../../../.to-migrate/original-mysql-everything-except-stories.sql',
);
const STORIES_FILE = path.resolve(
  __dirname,
  '../../../../.to-migrate/original-mysql-stories-200mb.sql',
);

const STORY_BATCH_SIZE = 500;

const EMOTION_TAG_MAP: Record<string, EmotionTag | null> = {
  uplifting: EmotionTag.uplifting,
  surprising: EmotionTag.surprising,
  frustrating: EmotionTag.frustrating,
  scary: EmotionTag.scary,
  calm: EmotionTag.calm,
};

const stats: MigrationStats = {
  issues: { created: 0, updated: 0, skipped: 0 },
  feeds: { created: 0, updated: 0, skipped: 0 },
  stories: { created: 0, updated: 0, skipped: 0, errors: 0 },
  newsletters: { created: 0, updated: 0, skipped: 0 },
  podcasts: { created: 0, updated: 0, skipped: 0 },
  warnings: [],
};

// Lookup maps: old MySQL ID → new Postgres UUID
const issueSlugToId = new Map<string, string>();
const oldFeedIdToNewId = new Map<number, string>();
const oldStoryPostIdToNewId = new Map<number, string>();

// ─── ISSUES ─────────────────────────────────────────────────────────────────

async function migrateIssues(): Promise<void> {
  console.log('\n📦 Migrating issues...');

  // Parse old issues to grab their prompt data
  const oldIssues = new Map<number, MySqlIssue>();
  const issueColumns = [
    'id',
    'category_id',
    'name',
    'description',
    'factors',
    'antifactors',
    'ratings',
  ];
  for await (const row of parseMySqlDump<MySqlIssue>(
    SMALL_FILE,
    'wp_rs_issues',
    issueColumns,
  )) {
    oldIssues.set(row.id as number, row);
  }
  console.log(`  Parsed ${oldIssues.size} old issues`);

  for (const consolidated of CONSOLIDATED_ISSUES) {
    // Use the first (primary) old issue for prompt data
    const primaryOld = oldIssues.get(consolidated.sourceOldIds[0]);

    const result = await prisma.issue.upsert({
      where: { slug: consolidated.slug },
      create: {
        name: consolidated.name,
        slug: consolidated.slug,
        description: consolidated.description,
        promptFactors: primaryOld?.factors ?? '',
        promptAntifactors: primaryOld?.antifactors ?? '',
        promptRatings: primaryOld?.ratings ?? '',
      },
      update: {
        name: consolidated.name,
        description: consolidated.description,
        promptFactors: primaryOld?.factors ?? '',
        promptAntifactors: primaryOld?.antifactors ?? '',
        promptRatings: primaryOld?.ratings ?? '',
      },
    });

    issueSlugToId.set(consolidated.slug, result.id);
    stats.issues.created++;
  }

  console.log(`  Upserted ${stats.issues.created} consolidated issues`);
}

// ─── FEEDS ──────────────────────────────────────────────────────────────────

async function migrateFeeds(): Promise<void> {
  console.log('\n📡 Migrating feeds...');

  const feedColumns = [
    'id',
    'issue_id',
    'title',
    'description',
    'url',
    'active',
    'comment',
    'interval_hours',
    'last_crawled',
    'content_container',
    'language',
  ];

  let count = 0;
  for await (const row of parseMySqlDump<MySqlFeed>(
    SMALL_FILE,
    'wp_rs_feeds',
    feedColumns,
  )) {
    const oldIssueId = row.issue_id as number | null;
    const slug = oldIssueId != null ? OLD_ISSUE_ID_TO_SLUG[oldIssueId] : null;
    const issueId = slug ? issueSlugToId.get(slug) : null;
    const fallbackIssueId = issueSlugToId.get('general-news');

    const resolvedIssueId = issueId ?? fallbackIssueId;

    if (!resolvedIssueId) {
      stats.feeds.skipped++;
      stats.warnings.push(
        `Feed "${row.title}" (old id=${row.id}) skipped: no valid issue ID and general-news fallback unavailable`,
      );
      continue;
    }

    if (!issueId) {
      stats.warnings.push(
        `Feed "${row.title}" (old id=${row.id}) has unmapped issue_id=${oldIssueId}, assigned to general-news`,
      );
    }

    const feedUrl = (row.url as string).trim();
    const feedTitle = [row.title, row.description].filter(Boolean).join(' - ');

    const result = await prisma.feed.upsert({
      where: { url: feedUrl },
      create: {
        title: feedTitle,
        url: feedUrl,
        language: (row.language as string) || 'en',
        issueId: resolvedIssueId,
        active: row.active === 1,
        crawlIntervalHours: (row.interval_hours as number) || 24,
        lastCrawledAt: parseMySqlDate(row.last_crawled as string | null),
        htmlSelector: (row.content_container as string) || null,
      },
      update: {
        title: feedTitle,
        language: (row.language as string) || 'en',
        issueId: resolvedIssueId,
        active: row.active === 1,
        crawlIntervalHours: (row.interval_hours as number) || 24,
        lastCrawledAt: parseMySqlDate(row.last_crawled as string | null),
        htmlSelector: (row.content_container as string) || null,
      },
    });

    oldFeedIdToNewId.set(row.id as number, result.id);
    stats.feeds.created++;
    count++;
  }

  console.log(`  Upserted ${count} feeds`);
}

// ─── STORIES ────────────────────────────────────────────────────────────────

function determineStoryStatus(
  postId: number,
  ratingLow: number | null,
  ratingHigh: number | null,
): StoryStatus {
  if (postId > 0) return StoryStatus.published;
  if (ratingHigh != null && ratingLow != null) return StoryStatus.rejected;
  if (ratingLow != null) return StoryStatus.pre_analyzed;
  return StoryStatus.fetched;
}

function mapEmotionTag(raw: string): EmotionTag | null {
  if (!raw || raw.trim() === '') return null;
  const normalized = raw.trim().toLowerCase();
  return EMOTION_TAG_MAP[normalized] ?? null;
}

async function migrateStories(): Promise<void> {
  console.log('\n📰 Migrating stories (streaming)...');

  const storyColumns = [
    'id',
    'feed_id',
    'issue_id',
    'post_id',
    'date_published',
    'url',
    'date_crawled',
    'title',
    'content',
    'relevance_rating_low',
    'relevance_rating_high',
    'emotion_tag',
    'ai_response',
  ];

  let batch: MySqlStory[] = [];
  let total = 0;

  for await (const row of parseMySqlDump<MySqlStory>(
    STORIES_FILE,
    'wp_rs_stories',
    storyColumns,
  )) {
    batch.push(row);

    if (batch.length >= STORY_BATCH_SIZE) {
      await processStoryBatch(batch);
      total += batch.length;
      process.stdout.write(`\r  Processed ${total} stories...`);
      batch = [];
    }
  }

  // Process remaining
  if (batch.length > 0) {
    await processStoryBatch(batch);
    total += batch.length;
  }

  console.log(`\n  Migrated ${total} stories (${stats.stories.created} created, ${stats.stories.updated} updated, ${stats.stories.skipped} skipped, ${stats.stories.errors} errors)`);
}

async function processStoryBatch(batch: MySqlStory[]): Promise<void> {
  // Build all upsert operations and execute them in a transaction
  const operations = [];

  for (const row of batch) {
    try {
      const feedId = row.feed_id as number | null;
      const newFeedId = feedId != null ? oldFeedIdToNewId.get(feedId) : null;

      if (!newFeedId) {
        stats.stories.skipped++;
        continue;
      }

      const storyUrl = (row.url as string).trim();
      if (!storyUrl) {
        stats.stories.skipped++;
        continue;
      }

      const ratingLow = row.relevance_rating_low as number | null;
      const ratingHigh = row.relevance_rating_high as number | null;
      const postId = row.post_id as number;
      const status = determineStoryStatus(postId, ratingLow, ratingHigh);
      const emotionTag = mapEmotionTag(row.emotion_tag as string);
      const aiRaw = row.ai_response as string;
      const parsed = parseAiResponse(aiRaw);

      const datePublished = parseMySqlDate(row.date_published as string | null);
      const dateCrawled = parseMySqlDate(row.date_crawled as string | null) ?? new Date();

      const data = {
        title: row.title as string,
        content: row.content as string,
        datePublished,
        dateCrawled,
        feedId: newFeedId,
        status,
        relevanceRatingLow: ratingLow,
        relevanceRatingHigh: ratingHigh,
        emotionTag,
        aiResponse: aiRaw ? { raw: aiRaw } : undefined,
        aiSummary: parsed.summary,
        aiMarketingBlurb: parsed.relevanceTitle,
        aiRelevanceReasons: parsed.reasons,
        aiScenarios: parsed.scenarios,
        aiRelevanceCalculation: parsed.relevanceSummary,
      };

      operations.push({
        row,
        upsert: prisma.story.upsert({
          where: { url: storyUrl },
          create: { url: storyUrl, ...data },
          update: data,
        }),
      });
    } catch (err) {
      stats.stories.errors++;
      const msg = err instanceof Error ? err.message : String(err);
      if (stats.warnings.length < 50) {
        stats.warnings.push(
          `Story prep error (old id=${row.id}, url=${row.url}): ${msg.slice(0, 200)}`,
        );
      }
    }
  }

  if (operations.length === 0) return;

  // Execute batch in a transaction for better throughput
  try {
    const results = await prisma.$transaction(
      operations.map((op) => op.upsert),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const row = operations[i].row;
      const postId = row.post_id as number;

      if (postId > 0) {
        oldStoryPostIdToNewId.set(postId, result.id);
      }

      stats.stories.created++;
    }
  } catch (err) {
    // If the transaction fails, fall back to individual upserts
    // so one bad row doesn't block the entire batch
    for (const op of operations) {
      try {
        const result = await op.upsert;
        const postId = op.row.post_id as number;
        if (postId > 0) {
          oldStoryPostIdToNewId.set(postId, result.id);
        }
        stats.stories.created++;
      } catch (individualErr) {
        stats.stories.errors++;
        const msg = individualErr instanceof Error ? individualErr.message : String(individualErr);
        if (stats.warnings.length < 50) {
          stats.warnings.push(
            `Story error (old id=${op.row.id}, url=${op.row.url}): ${msg.slice(0, 200)}`,
          );
        }
      }
    }
  }
}

// ─── NEWSLETTERS ────────────────────────────────────────────────────────────

async function migrateNewsletters(): Promise<void> {
  console.log('\n📬 Migrating newsletters...');

  const columns = [
    'id',
    'title',
    'post_ids',
    'content',
    'date_published',
    'url',
    'twitter',
  ];

  let count = 0;
  for await (const row of parseMySqlDump<MySqlNewsletter>(
    SMALL_FILE,
    'wp_rs_newsletters',
    columns,
  )) {
    const title = row.title as string;
    const postIdsStr = row.post_ids as string;
    const storyIds = mapPostIds(postIdsStr);

    // Check if newsletter already exists by title
    const existing = await prisma.newsletter.findFirst({
      where: { title },
    });

    if (existing) {
      await prisma.newsletter.update({
        where: { id: existing.id },
        data: {
          content: row.content as string,
          storyIds,
          status: ContentStatus.published,
        },
      });
      stats.newsletters.updated++;
    } else {
      await prisma.newsletter.create({
        data: {
          title,
          content: row.content as string,
          storyIds,
          status: ContentStatus.published,
          createdAt: parseMySqlDate(row.date_published as string) ?? new Date(),
        },
      });
      stats.newsletters.created++;
    }
    count++;
  }

  console.log(`  Migrated ${count} newsletters`);
}

// ─── PODCASTS ───────────────────────────────────────────────────────────────

async function migratePodcasts(): Promise<void> {
  console.log('\n🎙️ Migrating podcasts...');

  const columns = ['id', 'title', 'post_ids', 'content', 'date_published', 'url'];

  let count = 0;
  for await (const row of parseMySqlDump<MySqlPodcast>(
    SMALL_FILE,
    'wp_rs_podcasts',
    columns,
  )) {
    const title = row.title as string;
    const postIdsStr = row.post_ids as string;
    const storyIds = mapPostIds(postIdsStr);

    const existing = await prisma.podcast.findFirst({
      where: { title },
    });

    if (existing) {
      await prisma.podcast.update({
        where: { id: existing.id },
        data: {
          script: row.content as string,
          storyIds,
          status: ContentStatus.published,
        },
      });
      stats.podcasts.updated++;
    } else {
      await prisma.podcast.create({
        data: {
          title,
          script: row.content as string,
          storyIds,
          status: ContentStatus.published,
          createdAt: parseMySqlDate(row.date_published as string) ?? new Date(),
        },
      });
      stats.podcasts.created++;
    }
    count++;
  }

  console.log(`  Migrated ${count} podcasts`);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function parseMySqlDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  // MySQL zero-dates
  if (dateStr === '0000-00-00 00:00:00' || dateStr === '1970-01-01 00:00:00') {
    return null;
  }
  // Treat MySQL dates as UTC
  const d = new Date(dateStr + ' UTC');
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Map old post_ids string (e.g. "[604,605,606]" or "604,605,606") to new story UUIDs.
 */
function mapPostIds(postIdsStr: string): string[] {
  if (!postIdsStr || postIdsStr.trim() === '') return [];

  const cleaned = postIdsStr.replace(/[\[\]]/g, '').trim();
  if (!cleaned) return [];

  const ids = cleaned
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  const mapped: string[] = [];
  for (const oldId of ids) {
    const newId = oldStoryPostIdToNewId.get(oldId);
    if (newId) {
      mapped.push(newId);
    } else {
      if (stats.warnings.length < 100) {
        stats.warnings.push(
          `Newsletter/Podcast references post_id=${oldId} which was not found in migrated stories`,
        );
      }
    }
  }

  return mapped;
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🚀 Starting MySQL → PostgreSQL migration\n');
  console.log(`  Small file: ${SMALL_FILE}`);
  console.log(`  Stories file: ${STORIES_FILE}`);

  const start = Date.now();

  try {
    await migrateIssues();
    await migrateFeeds();
    await migrateStories();
    await migrateNewsletters();
    await migratePodcasts();
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration complete');
  console.log('='.repeat(60));
  console.log(`  Issues:      ${stats.issues.created} upserted`);
  console.log(`  Feeds:       ${stats.feeds.created} upserted, ${stats.feeds.skipped} skipped`);
  console.log(
    `  Stories:     ${stats.stories.created} upserted, ${stats.stories.skipped} skipped, ${stats.stories.errors} errors`,
  );
  console.log(
    `  Newsletters: ${stats.newsletters.created} created, ${stats.newsletters.updated} updated`,
  );
  console.log(
    `  Podcasts:    ${stats.podcasts.created} created, ${stats.podcasts.updated} updated`,
  );
  console.log(`  Duration:    ${elapsed}s`);

  if (stats.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${stats.warnings.length}):`);
    for (const w of stats.warnings.slice(0, 30)) {
      console.log(`    - ${w}`);
    }
    if (stats.warnings.length > 30) {
      console.log(`    ... and ${stats.warnings.length - 30} more`);
    }
  }
}

main();
