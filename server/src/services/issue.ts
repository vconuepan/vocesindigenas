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

const PUBLIC_ISSUE_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
} as const

export async function getPublicIssues() {
  return prisma.issue.findMany({
    select: PUBLIC_ISSUE_SELECT,
    orderBy: { name: 'asc' },
  })
}

export async function getPublicIssueBySlug(slug: string) {
  return prisma.issue.findFirst({
    where: { slug },
    select: PUBLIC_ISSUE_SELECT,
  })
}

export async function deleteIssue(id: string): Promise<void> {
  const feedCount = await prisma.feed.count({ where: { issueId: id } })
  if (feedCount > 0) {
    throw new Error('Cannot delete issue with existing feeds')
  }
  await prisma.issue.delete({ where: { id } })
}
