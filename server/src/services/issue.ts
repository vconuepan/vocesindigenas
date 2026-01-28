import prisma from '../lib/prisma.js'
import type { Issue } from '@prisma/client'

export async function getAllIssues(): Promise<Issue[]> {
  return prisma.issue.findMany({ orderBy: { name: 'asc' } })
}

export async function getIssueById(id: string): Promise<Issue | null> {
  return prisma.issue.findUnique({ where: { id } })
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
}): Promise<Issue> {
  return prisma.issue.create({ data })
}

export async function updateIssue(id: string, data: Partial<{
  name: string
  slug: string
  description: string
  promptFactors: string
  promptAntifactors: string
  promptRatings: string
}>): Promise<Issue> {
  return prisma.issue.update({ where: { id }, data })
}

export async function deleteIssue(id: string): Promise<void> {
  const feedCount = await prisma.feed.count({ where: { issueId: id } })
  if (feedCount > 0) {
    throw new Error('Cannot delete issue with existing feeds')
  }
  await prisma.issue.delete({ where: { id } })
}
