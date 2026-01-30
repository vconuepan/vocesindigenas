import prisma from '../lib/prisma.js'
import type { Issue } from '@prisma/client'

// --- JSON field helpers ---

function serializeJsonFields(data: Record<string, any>): Record<string, any> {
  const result = { ...data }
  if ('evaluationCriteria' in result) {
    result.evaluationCriteria = JSON.stringify(result.evaluationCriteria ?? [])
  }
  if ('sourceNames' in result) {
    result.sourceNames = JSON.stringify(result.sourceNames ?? [])
  }
  if ('makeADifference' in result) {
    result.makeADifference = JSON.stringify(result.makeADifference ?? [])
  }
  return result
}

function parseJsonFields(issue: Issue) {
  return {
    ...issue,
    evaluationCriteria: safeParseJson(issue.evaluationCriteria, []),
    sourceNames: safeParseJson(issue.sourceNames, []),
    makeADifference: safeParseJson(issue.makeADifference, []),
  }
}

function safeParseJson<T>(value: string, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

// --- Admin queries ---

export async function getAllIssues() {
  const issues = await prisma.issue.findMany({
    orderBy: { name: 'asc' },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: { select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } },
      feeds: {
        select: {
          _count: { select: { stories: { where: { status: 'published' } } } }
        }
      }
    }
  })
  return issues.map(({ feeds, ...issue }) => ({
    ...parseJsonFields(issue as unknown as Issue),
    parent: issue.parent,
    children: issue.children,
    publishedStoryCount: feeds.reduce((sum, f) => sum + f._count.stories, 0),
  }))
}

export async function getIssueById(id: string) {
  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: { select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } },
    },
  })
  if (!issue) return null
  return { ...parseJsonFields(issue as unknown as Issue), parent: issue.parent, children: issue.children }
}

export async function getIssueBySlug(slug: string): Promise<Issue | null> {
  return prisma.issue.findUnique({ where: { slug } })
}

export async function createIssue(data: {
  name: string
  slug: string
  description?: string
  promptFactors?: string
  promptAntifactors?: string
  promptRatings?: string
  parentId?: string | null
  intro?: string
  evaluationIntro?: string
  evaluationCriteria?: string[]
  sourceNames?: string[]
  makeADifference?: { label: string; url: string }[]
}) {
  if (data.parentId) {
    await validateParent(data.parentId)
  }
  const issue = await prisma.issue.create({ data: serializeJsonFields(data) as any })
  return parseJsonFields(issue)
}

export async function updateIssue(id: string, data: Partial<{
  name: string
  slug: string
  description: string
  promptFactors: string
  promptAntifactors: string
  promptRatings: string
  parentId: string | null
  intro: string
  evaluationIntro: string
  evaluationCriteria: string[]
  sourceNames: string[]
  makeADifference: { label: string; url: string }[]
}>) {
  if ('parentId' in data && data.parentId !== undefined) {
    if (data.parentId !== null) {
      await validateParent(data.parentId, id)
    }
    // If this issue has children, it cannot become a child itself
    const childCount = await prisma.issue.count({ where: { parentId: id } })
    if (childCount > 0 && data.parentId !== null) {
      throw new Error('Cannot set parent on an issue that has children')
    }
  }
  const issue = await prisma.issue.update({ where: { id }, data: serializeJsonFields(data) })
  return parseJsonFields(issue)
}

async function validateParent(parentId: string, selfId?: string) {
  if (selfId && parentId === selfId) {
    throw new Error('An issue cannot be its own parent')
  }
  const parent = await prisma.issue.findUnique({ where: { id: parentId } })
  if (!parent) {
    throw new Error('Parent issue not found')
  }
  if (parent.parentId) {
    throw new Error('Cannot nest more than one level deep')
  }
}

// --- Public queries ---

const PUBLIC_ISSUE_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  intro: true,
  evaluationIntro: true,
  evaluationCriteria: true,
  sourceNames: true,
  makeADifference: true,
  parentId: true,
} as const

function parsePublicIssueJson(issue: any) {
  return {
    ...issue,
    evaluationCriteria: safeParseJson(issue.evaluationCriteria, []),
    sourceNames: safeParseJson(issue.sourceNames, []),
    makeADifference: safeParseJson(issue.makeADifference, []),
  }
}

export async function getPublicIssues() {
  const issues = await prisma.issue.findMany({
    where: { parentId: null },
    select: {
      ...PUBLIC_ISSUE_SELECT,
      children: {
        select: PUBLIC_ISSUE_SELECT,
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })
  return issues.map(issue => ({
    ...parsePublicIssueJson(issue),
    children: issue.children.map(parsePublicIssueJson),
  }))
}

export async function getPublicIssueBySlug(slug: string) {
  const issue = await prisma.issue.findFirst({
    where: { slug },
    select: {
      ...PUBLIC_ISSUE_SELECT,
      children: {
        select: {
          ...PUBLIC_ISSUE_SELECT,
          feeds: {
            select: {
              _count: { select: { stories: { where: { status: 'published' } } } },
            },
          },
        },
        orderBy: { name: 'asc' },
      },
      parent: {
        select: { id: true, name: true, slug: true },
      },
    },
  })
  if (!issue) return null
  return {
    ...parsePublicIssueJson(issue),
    children: issue.children?.map(({ feeds, ...child }) => ({
      ...parsePublicIssueJson(child),
      publishedStoryCount: feeds.reduce((sum, f) => sum + f._count.stories, 0),
    })) ?? [],
    parent: issue.parent,
  }
}

// --- Delete ---

export async function deleteIssue(id: string): Promise<void> {
  const [feedCount, childCount] = await Promise.all([
    prisma.feed.count({ where: { issueId: id } }),
    prisma.issue.count({ where: { parentId: id } }),
  ])
  if (feedCount > 0) {
    throw new Error('Cannot delete issue with existing feeds')
  }
  if (childCount > 0) {
    throw new Error('Cannot delete issue with child issues')
  }
  await prisma.issue.delete({ where: { id } })
}
