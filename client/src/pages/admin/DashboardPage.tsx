import { Helmet } from 'react-helmet-async'
import { STORY_STATUSES } from '@shared/constants'
import { useStoryStats } from '../../hooks/useStoryStats'
import { useJobs, useRunJob } from '../../hooks/useJobs'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { formatStatus, formatDateWithTime, STATUS_VARIANTS, JOB_DISPLAY_NAMES, JOB_PIPELINE_ORDER } from '../../lib/constants'

function StatsGrid({ stats }: { stats: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {STORY_STATUSES.map(status => (
        <div key={status} className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-1">
            <Badge variant={STATUS_VARIANTS[status]}>{formatStatus(status)}</Badge>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{stats[status] || 0}</p>
        </div>
      ))}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
        <p className="text-xs font-medium text-neutral-500 mb-1">Total</p>
        <p className="text-2xl font-bold text-neutral-900">
          {Object.values(stats).reduce((sum, n) => sum + n, 0)}
        </p>
      </div>
    </div>
  )
}

function JobStatusDot({ job }: { job: { lastStartedAt: string | null; lastCompletedAt: string | null; lastError: string | null; enabled: boolean } }) {
  if (!job.enabled) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-300" title="Disabled" />

  const started = job.lastStartedAt ? new Date(job.lastStartedAt).getTime() : 0
  const completed = job.lastCompletedAt ? new Date(job.lastCompletedAt).getTime() : 0

  if (started > completed) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400 animate-pulse" title="Running" />
  if (job.lastError) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" title="Error" />
  if (job.lastCompletedAt) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" title="OK" />
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-300" title="Never run" />
}

export default function DashboardPage() {
  const statsQuery = useStoryStats()
  const jobsQuery = useJobs()
  const runJob = useRunJob()

  return (
    <>
      <Helmet>
        <title>Dashboard — Admin — Actually Relevant</title>
      </Helmet>

      <PageHeader title="Dashboard" description="Overview of stories and jobs" />

      {/* Story Stats */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">Stories by Status</h2>
        {statsQuery.isLoading && (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        )}
        {statsQuery.error && (
          <ErrorState message="Failed to load stats" onRetry={() => statsQuery.refetch()} />
        )}
        {statsQuery.data && <StatsGrid stats={statsQuery.data} />}
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {JOB_PIPELINE_ORDER.map(jobName => (
            <Button
              key={jobName}
              variant="secondary"
              size="sm"
              loading={runJob.isPending && runJob.variables === jobName}
              onClick={() => runJob.mutate(jobName)}
            >
              {JOB_DISPLAY_NAMES[jobName]}
            </Button>
          ))}
        </div>
      </section>

      {/* Jobs Health */}
      <section>
        <Card title="Jobs">
          {jobsQuery.isLoading && (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          )}
          {jobsQuery.error && (
            <ErrorState message="Failed to load jobs" onRetry={() => jobsQuery.refetch()} />
          )}
          {jobsQuery.data && (
            <div className="overflow-x-auto -mx-4 -my-3">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-2 px-4 font-medium text-neutral-500">Job</th>
                    <th className="text-left py-2 px-4 font-medium text-neutral-500">Status</th>
                    <th className="text-left py-2 px-4 font-medium text-neutral-500">Last Run</th>
                    <th className="text-left py-2 px-4 font-medium text-neutral-500">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {[...jobsQuery.data].sort((a, b) => {
                    const ai = JOB_PIPELINE_ORDER.indexOf(a.jobName)
                    const bi = JOB_PIPELINE_ORDER.indexOf(b.jobName)
                    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
                  }).map(job => (
                    <tr key={job.jobName} className="border-b border-neutral-100 last:border-0">
                      <td className="py-2 px-4 font-medium text-neutral-900">
                        {JOB_DISPLAY_NAMES[job.jobName] || job.jobName}
                      </td>
                      <td className="py-2 px-4">
                        <JobStatusDot job={job} />
                      </td>
                      <td className="py-2 px-4 text-neutral-500">
                        {formatDateWithTime(job.lastCompletedAt)}
                      </td>
                      <td className="py-2 px-4 text-neutral-500 max-w-xs truncate">
                        {job.lastError ? (
                          <span className="text-red-600" title={job.lastError}>
                            {job.lastError.slice(0, 80)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </>
  )
}
