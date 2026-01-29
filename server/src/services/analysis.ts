import { HumanMessage } from '@langchain/core/messages'
import prisma from '../lib/prisma.js'
import { getSmallLLM, getLargeLLM, rateLimitDelay } from './llm.js'
import { buildPreassessPrompt, buildAssessPrompt, buildSelectPrompt } from './prompts.js'
import { preAssessResultSchema, assessResultSchema, selectResultSchema } from '../schemas/llm.js'

interface Guidelines {
  factors: string
  antifactors: string
  ratings: string
}

function getGuidelines(issue: { promptFactors: string; promptAntifactors: string; promptRatings: string }): Guidelines {
  return {
    factors: issue.promptFactors,
    antifactors: issue.promptAntifactors,
    ratings: issue.promptRatings,
  }
}

export async function preAssessStories(storyIds: string[]): Promise<{ storyId: string; rating: number; emotionTag: string }[]> {
  const stories = await prisma.story.findMany({
    where: { id: { in: storyIds } },
    include: { feed: { include: { issue: true } } },
  })

  // Group stories by issue for batching
  const byIssue = new Map<string, typeof stories>()
  for (const story of stories) {
    const issueId = story.feed.issue.id
    if (!byIssue.has(issueId)) byIssue.set(issueId, [])
    byIssue.get(issueId)!.push(story)
  }

  const results: { storyId: string; rating: number; emotionTag: string }[] = []
  const llm = getSmallLLM()
  const structuredLlm = llm.withStructuredOutput(preAssessResultSchema)

  for (const [, issueStories] of byIssue) {
    const issue = issueStories[0].feed.issue
    const guidelines = getGuidelines(issue)

    // Process in batches of ~10
    for (let i = 0; i < issueStories.length; i += 10) {
      const batch = issueStories.slice(i, i + 10)
      const prompt = buildPreassessPrompt(
        batch.map(s => ({ id: s.id, title: s.title, content: s.content })),
        guidelines,
      )

      await rateLimitDelay()
      const response = await structuredLlm.invoke([new HumanMessage(prompt)])

      for (const item of response.articles) {
        const story = batch.find(s => s.id === item.articleId)
        if (!story) continue

        await prisma.story.update({
          where: { id: story.id },
          data: {
            relevanceRatingLow: item.rating,
            emotionTag: item.emotionTag as any,
            status: 'pre_analyzed',
          },
        })

        results.push({
          storyId: story.id,
          rating: item.rating,
          emotionTag: item.emotionTag,
        })
      }
    }
  }

  return results
}

export async function assessStory(storyId: string): Promise<void> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { feed: { include: { issue: true } } },
  })
  if (!story) throw new Error('Story not found')

  const guidelines = getGuidelines(story.feed.issue)
  const publisher = story.feed.title
  const prompt = buildAssessPrompt(story.title, story.content, publisher, story.url, guidelines)

  await rateLimitDelay()
  const llm = getLargeLLM()
  const structuredLlm = llm.withStructuredOutput(assessResultSchema)
  const parsed = await structuredLlm.invoke([new HumanMessage(prompt)])

  await prisma.story.update({
    where: { id: storyId },
    data: {
      aiResponse: parsed as any,
      aiSummary: parsed.summary || null,
      aiQuote: parsed.quote || null,
      aiKeywords: parsed.keywords,
      aiMarketingBlurb: parsed.marketingBlurb || null,
      aiRelevanceReasons: parsed.factors.join('\n'),
      aiAntifactors: parsed.limitingFactors.join('\n'),
      aiRelevanceCalculation: parsed.relevanceCalculation.join('\n'),
      aiScenarios: parsed.scenarios.join('\n'),
      relevanceRatingLow: parsed.conservativeRating,
      relevanceRatingHigh: parsed.speculativeRating,
      status: 'analyzed',
    },
  })
}

export async function selectStories(storyIds: string[]): Promise<{ selected: string[]; rejected: string[] }> {
  const stories = await prisma.story.findMany({
    where: { id: { in: storyIds } },
  })

  if (stories.length === 0) return { selected: [], rejected: [] }

  const toSelect = Math.ceil(stories.length * 0.5)
  const prompt = buildSelectPrompt(
    stories.map(s => ({
      id: s.id,
      title: s.title,
      aiSummary: s.aiSummary,
      aiRelevanceReasons: s.aiRelevanceReasons,
      aiAntifactors: s.aiAntifactors,
      aiRelevanceCalculation: s.aiRelevanceCalculation,
    })),
    toSelect,
  )

  await rateLimitDelay()
  const llm = getSmallLLM()
  const structuredLlm = llm.withStructuredOutput(selectResultSchema)
  const response = await structuredLlm.invoke([new HumanMessage(prompt)])

  const selectedSet = new Set(response.selectedIds)
  const selected: string[] = []
  const rejected: string[] = []

  for (const story of stories) {
    if (selectedSet.has(story.id)) {
      selected.push(story.id)
    } else {
      rejected.push(story.id)
    }
  }

  if (selected.length > 0) {
    await prisma.story.updateMany({
      where: { id: { in: selected } },
      data: { status: 'selected' },
    })
  }
  if (rejected.length > 0) {
    await prisma.story.updateMany({
      where: { id: { in: rejected } },
      data: { status: 'rejected' },
    })
  }

  return { selected, rejected }
}
