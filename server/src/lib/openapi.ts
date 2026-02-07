import 'zod-openapi/extend'
import { z } from 'zod'
import { createDocument } from 'zod-openapi'

// --- Reusable schemas ---

const issueRefSchema = z.object({
  name: z.string().openapi({ example: 'Planet & Climate' }),
  slug: z.string().openapi({ example: 'planet-climate' }),
}).openapi({ ref: 'IssueRef' })

const feedRefSchema = z.object({
  id: z.string().uuid(),
  title: z.string().openapi({ example: 'The Guardian Environment' }),
  displayTitle: z.string().nullable().openapi({ example: 'The Guardian' }),
  issue: issueRefSchema.nullable(),
}).openapi({ ref: 'FeedRef' })

const publicStorySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().nullable().openapi({ example: 'new-coral-reef-discovered-pacific' }),
  sourceUrl: z.string().url().openapi({ example: 'https://example.com/article' }),
  sourceTitle: z.string().openapi({ example: 'Major climate breakthrough announced' }),
  title: z.string().nullable().openapi({ example: 'Scientists announce major climate breakthrough' }),
  titleLabel: z.string().nullable().openapi({ example: 'Climate' }),
  dateCrawled: z.string().datetime(),
  datePublished: z.string().datetime().nullable(),
  status: z.enum(['published']),
  relevancePre: z.number().int().min(0).max(10).nullable(),
  relevance: z.number().int().min(0).max(10).nullable().openapi({ example: 8 }),
  emotionTag: z.enum(['uplifting', 'frustrating', 'scary', 'calm']).nullable(),
  summary: z.string().nullable().openapi({ example: 'Researchers have developed a new carbon capture method...' }),
  quote: z.string().nullable(),
  quoteAttribution: z.string().nullable(),
  marketingBlurb: z.string().nullable(),
  relevanceReasons: z.string().nullable(),
  relevanceSummary: z.string().nullable(),
  antifactors: z.string().nullable(),
  issue: issueRefSchema.nullable(),
  feed: feedRefSchema,
}).openapi({ ref: 'PublicStory' })

const paginationMeta = {
  total: z.number().int().openapi({ example: 142 }),
  page: z.number().int().openapi({ example: 1 }),
  pageSize: z.number().int().openapi({ example: 25 }),
  totalPages: z.number().int().openapi({ example: 6 }),
}

const storyListResponseSchema = z.object({
  data: z.array(publicStorySchema),
  ...paginationMeta,
}).openapi({ ref: 'StoryListResponse' })

const makeADifferenceSchema = z.object({
  label: z.string().openapi({ example: 'Donate to reforestation' }),
  url: z.string().url().openapi({ example: 'https://example.org/donate' }),
})

const publicIssueSchema: z.ZodType<any> = z.object({
  id: z.string().uuid(),
  name: z.string().openapi({ example: 'Planet & Climate' }),
  slug: z.string().openapi({ example: 'planet-climate' }),
  description: z.string(),
  intro: z.string(),
  evaluationIntro: z.string(),
  evaluationCriteria: z.array(z.string()),
  makeADifference: z.array(makeADifferenceSchema),
  parentId: z.string().uuid().nullable(),
  sourceNames: z.array(z.string()),
  children: z.array(z.lazy(() => publicIssueSchema)).optional(),
}).openapi({ ref: 'PublicIssue' })

const emotionBucketSchema = z.object({
  uplifting: z.array(publicStorySchema),
  calm: z.array(publicStorySchema),
  negative: z.array(publicStorySchema),
})

const homepageResponseSchema = z.object({
  issues: z.array(publicIssueSchema),
  storiesByIssue: z.record(z.string(), emotionBucketSchema),
}).openapi({ ref: 'HomepageResponse' })

const subscribeRequestSchema = z.object({
  email: z.string().email().max(255).openapi({ example: 'reader@example.com' }),
  firstName: z.string().max(100).optional().openapi({ example: 'Alex' }),
}).openapi({ ref: 'SubscribeRequest' })

const subscribeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().openapi({ example: 'Check your email to confirm your subscription.' }),
}).openapi({ ref: 'SubscribeResponse' })

const errorResponseSchema = z.object({
  error: z.string().openapi({ example: 'Not found' }),
}).openapi({ ref: 'ErrorResponse' })

// --- Document ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOpenAPIDocument(): any {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'Actually Relevant API',
      version: '1.0.0',
      description:
        'Public API for Actually Relevant — an AI-curated news platform that evaluates article relevance to humanity. ' +
        'Access published stories, issues, homepage data, and RSS feeds. No authentication required.',
      contact: {
        name: 'Actually Relevant',
        url: 'https://actuallyrelevant.news',
      },
    },
    servers: [
      { url: 'https://api.actuallyrelevant.news', description: 'Production' },
    ],
    paths: {
      '/api/homepage': {
        get: {
          operationId: 'getHomepage',
          summary: 'Get homepage data',
          description:
            'Returns all issues and their stories grouped by emotion tag (uplifting, calm, negative). ' +
            'Used by the client to power the positivity slider without additional API calls.',
          tags: ['Homepage'],
          responses: {
            '200': {
              description: 'Homepage data with issues and emotion-bucketed stories',
              content: {
                'application/json': { schema: homepageResponseSchema },
              },
            },
          },
        },
      },
      '/api/stories': {
        get: {
          operationId: 'listStories',
          summary: 'List published stories',
          description:
            'Returns a paginated list of published stories. Supports filtering by issue and semantic search.',
          tags: ['Stories'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1, minimum: 1 },
              description: 'Page number',
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', default: 25, minimum: 1, maximum: 100 },
              description: 'Number of stories per page',
            },
            {
              name: 'issueSlug',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by issue slug (e.g., "planet-climate")',
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string', maxLength: 200 },
              description: 'Semantic search query — searches by meaning, not just keywords',
            },
          ],
          responses: {
            '200': {
              description: 'Paginated list of published stories',
              content: {
                'application/json': { schema: storyListResponseSchema },
              },
            },
          },
        },
      },
      '/api/stories/{slug}': {
        get: {
          operationId: 'getStory',
          summary: 'Get a single story',
          description: 'Returns a single published story by its URL slug.',
          tags: ['Stories'],
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Story URL slug',
            },
          ],
          responses: {
            '200': {
              description: 'Story details',
              content: {
                'application/json': { schema: publicStorySchema },
              },
            },
            '404': {
              description: 'Story not found',
              content: {
                'application/json': { schema: errorResponseSchema },
              },
            },
          },
        },
      },
      '/api/issues': {
        get: {
          operationId: 'listIssues',
          summary: 'List all issues',
          description:
            'Returns all issues with their hierarchy (parents contain children). ' +
            'Cached for 5 minutes.',
          tags: ['Issues'],
          responses: {
            '200': {
              description: 'List of issues with hierarchy',
              content: {
                'application/json': {
                  schema: z.array(publicIssueSchema),
                },
              },
            },
          },
        },
      },
      '/api/issues/{slug}': {
        get: {
          operationId: 'getIssue',
          summary: 'Get a single issue',
          description: 'Returns a single issue by its URL slug, including children and source names.',
          tags: ['Issues'],
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Issue URL slug (e.g., "planet-climate")',
            },
          ],
          responses: {
            '200': {
              description: 'Issue details',
              content: {
                'application/json': { schema: publicIssueSchema },
              },
            },
            '404': {
              description: 'Issue not found',
              content: {
                'application/json': { schema: errorResponseSchema },
              },
            },
          },
        },
      },
      '/api/feed': {
        get: {
          operationId: 'getRssFeed',
          summary: 'RSS feed (all stories)',
          description: 'Returns an RSS 2.0 feed of all published stories. Cached for 15 minutes.',
          tags: ['Feed'],
          responses: {
            '200': {
              description: 'RSS 2.0 XML feed',
              content: {
                'application/rss+xml': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
      '/api/feed/{issueSlug}': {
        get: {
          operationId: 'getRssFeedByIssue',
          summary: 'RSS feed (per issue)',
          description: 'Returns an RSS 2.0 feed filtered to a specific issue. Cached for 15 minutes.',
          tags: ['Feed'],
          parameters: [
            {
              name: 'issueSlug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Issue slug to filter by',
            },
          ],
          responses: {
            '200': {
              description: 'RSS 2.0 XML feed for the specified issue',
              content: {
                'application/rss+xml': {
                  schema: { type: 'string' },
                },
              },
            },
            '404': {
              description: 'Issue not found',
              content: {
                'application/json': { schema: errorResponseSchema },
              },
            },
          },
        },
      },
      '/api/subscribe': {
        post: {
          operationId: 'subscribe',
          summary: 'Subscribe to newsletter',
          description:
            'Subscribe an email address to the weekly newsletter. ' +
            'A confirmation email will be sent. Rate limited to prevent abuse.',
          tags: ['Subscribe'],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: subscribeRequestSchema },
            },
          },
          responses: {
            '200': {
              description: 'Subscription initiated (check email for confirmation)',
              content: {
                'application/json': { schema: subscribeResponseSchema },
              },
            },
            '429': {
              description: 'Too many subscription attempts',
              content: {
                'application/json': { schema: errorResponseSchema },
              },
            },
          },
        },
      },
      '/api/subscribe/confirm': {
        get: {
          operationId: 'confirmSubscription',
          summary: 'Confirm newsletter subscription',
          description:
            'Confirms a newsletter subscription via the link sent by email. ' +
            'Redirects to the frontend with success or error status.',
          tags: ['Subscribe'],
          parameters: [
            {
              name: 'token',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'Confirmation token from email',
            },
            {
              name: 'email',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'Email address being confirmed',
            },
          ],
          responses: {
            '302': {
              description: 'Redirects to frontend (/subscribed or /subscribed?error=...)',
            },
          },
        },
      },
      '/api/sitemap.xml': {
        get: {
          operationId: 'getSitemap',
          summary: 'XML Sitemap',
          description: 'Returns a dynamic XML sitemap including all static pages and published stories. Cached for 1 hour.',
          tags: ['Sitemap'],
          responses: {
            '200': {
              description: 'XML Sitemap',
              content: {
                'application/xml': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {},
    },
    tags: [
      { name: 'Homepage', description: 'Homepage data with emotion-bucketed stories' },
      { name: 'Stories', description: 'Published story listing and detail' },
      { name: 'Issues', description: 'Issue categories and hierarchy' },
      { name: 'Feed', description: 'RSS 2.0 feeds' },
      { name: 'Subscribe', description: 'Newsletter subscription' },
      { name: 'Sitemap', description: 'XML Sitemap for search engines' },
    ],
  })
}
