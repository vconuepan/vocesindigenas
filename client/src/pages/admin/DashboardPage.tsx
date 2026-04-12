import { Helmet } from 'react-helmet-async'
import { PlayIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { STORY_STATUSES } from '@shared/constants'
import { useStoryStats } from '../../hooks/useStoryStats'
import { useJobs, useRunJob } from '../../hooks/useJobs'
import { adminApi } from '../../lib/admin-api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { JobStatusBadge } from '../../components/admin/JobStatusBadge'
import { ActionIconButton } from '../../components/ui/ActionIconButton'
import { formatStatus, STATUS_VARIANTS, JOB_DISPLAY_NAMES, JOB_PIPELINE_ORDER } from '../../lib/constants'
import { TimeWithRelative } from '../../components/admin/TimeWithRelative'

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

function CommunityStats() {
  const summaryQuery = useQuery({
    queryKey: ['admin', 'members', 'summary'],
    queryFn: () => adminApi.members.summary(),
  })
  const communitiesQuery = useQuery({
    queryKey: ['admin', 'communities'],
    queryFn: () => adminApi.communities.list(),
  })

  if (summaryQuery.isLoading || communitiesQuery.isLoading) {
    return <div className="flex justify-center py-4"><LoadingSpinner /></div>
  }

  const summary = summaryQuery.data
  const activeCommunities = (communitiesQuery.data ?? []).filter((c) => c.active).length
  const totalCommunities = (communitiesQuery.data ?? []).length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
        <p className="text-xs font-medium text-neutral-500 mb-1">Usuarios</p>
        <p className="text-2xl font-bold text-neutral-900">{summary?.totalUsers ?? 0}</p>
      </div>
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
        <p className="text-xs font-medium text-neutral-500 mb-1">Membresías</p>
        <p className="text-2xl font-bold text-neutral-900">{summary?.totalMemberships ?? 0}</p>
      </div>
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
        <p className="text-xs font-medium text-neutral-500 mb-1">Comunidades activas</p>
        <p className="text-2xl font-bold text-green-700">{activeCommunities}</p>
      </div>
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
        <p className="text-xs font-medium text-neutral-500 mb-1">Comunidades totales</p>
        <p className="text-2xl font-bold text-neutral-900">{totalCommunities}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const statsQuery = useStoryStats()
  const jobsQuery = useJobs()
  const runJob = useRunJob()

  return (
    <>
      <Helmet>
        <title>Dashboard — Admin — Impacto Indígena</title>
      </Helmet>

      <PageHeader title="Dashboard" description="Overview of stories and jobs" />

      {/* Community Stats */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">Comunidades y miembros</h2>
        <CommunityStats />
      </section>

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

      {/* Jobs */}
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
                    <th scope="col" className="text-left py-2 px-4 font-medium text-neutral-500">Job</th>
                    <th scope="col" className="text-left py-2 px-4 font-medium text-neutral-500">Status</th>
                    <th scope="col" className="text-left py-2 px-4 font-medium text-neutral-500">Last Run</th>
                    <th scope="col" className="text-left py-2 px-4 font-medium text-neutral-500 hidden sm:table-cell">Error</th>
                    <th scope="col" className="py-2 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...jobsQuery.data].sort((a, b) => {
                    const ai = JOB_PIPELINE_ORDER.indexOf(a.jobName)
                    const bi = JOB_PIPELINE_ORDER.indexOf(b.jobName)
                    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
                  }).map(job => (
                    <tr key={job.jobName} className={`border-b border-neutral-100 last:border-0 ${job.running ? 'bg-yellow-50' : ''}`}>
                      <td className="py-2 px-4 font-medium text-neutral-900">
                        {JOB_DISPLAY_NAMES[job.jobName] || job.jobName}
                      </td>
                      <td className="py-2 px-4">
                        <JobStatusBadge job={job} variant="dot" />
                      </td>
                      <td className="py-2 px-4 text-neutral-500 whitespace-nowrap">
                        <TimeWithRelative dateStr={job.lastCompletedAt} />
                      </td>
                      <td className="py-2 px-4 text-neutral-500 max-w-xs truncate hidden sm:table-cell">
                        {job.lastError ? (
                          <a
                            href="/admin/jobs"
                            className="text-red-600 hover:text-red-800"
                            title={job.lastError}
                          >
                            {job.lastError.slice(0, 80)}{job.lastError.length > 80 ? '...' : ''}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {job.running ? (
                          <span className="inline-block p-1">
                            <svg className="h-5 w-5 animate-spin text-yellow-600" viewBox="0 0 24 24" fill="none" aria-label="Running">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </span>
                        ) : (
                          <ActionIconButton
                            icon={PlayIcon}
                            label={`Run ${JOB_DISPLAY_NAMES[job.jobName] || job.jobName}`}
                            onClick={() => runJob.mutate(job.jobName)}
                            disabled={runJob.isPending && runJob.variables === job.jobName}
                          />
                        )}
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
