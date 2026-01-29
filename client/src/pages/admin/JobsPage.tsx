import { Helmet } from 'react-helmet-async'
import { useJobs } from '../../hooks/useJobs'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { JobsTable } from '../../components/admin/JobsTable'

export default function JobsPage() {
  const jobsQuery = useJobs({ refetchInterval: 10_000 })

  return (
    <>
      <Helmet>
        <title>Jobs — Admin — Actually Relevant</title>
      </Helmet>

      <PageHeader
        title="Jobs"
        description="Scheduled background jobs. Auto-refreshes every 10 seconds."
      />

      {jobsQuery.isLoading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}
      {jobsQuery.error && <ErrorState message="Failed to load jobs" onRetry={() => jobsQuery.refetch()} />}
      {jobsQuery.data && jobsQuery.data.length === 0 && <EmptyState title="No jobs configured" />}
      {jobsQuery.data && jobsQuery.data.length > 0 && <JobsTable jobs={jobsQuery.data} />}
    </>
  )
}
