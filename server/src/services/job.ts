import prisma from '../lib/prisma.js'
import { runningJobs } from '../jobs/scheduler.js'

export async function getJobs() {
  const jobs = await prisma.jobRun.findMany({ orderBy: { jobName: 'asc' } })
  return jobs.map(job => ({ ...job, running: runningJobs.has(job.jobName) }))
}

export async function updateJob(jobName: string, data: { cronExpression?: string; enabled?: boolean }) {
  return prisma.jobRun.update({ where: { jobName }, data })
}
