import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useNewsletter } from '../../hooks/useNewsletters'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { NewsletterDetail } from '../../components/admin/NewsletterDetail'

export default function NewsletterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: newsletter, isLoading, error, refetch } = useNewsletter(id || '')

  return (
    <>
      <Helmet>
        <title>{newsletter?.title || 'Newsletter'} — Admin — Actually Relevant</title>
      </Helmet>

      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/newsletters')}>
          <ArrowLeftIcon className="h-4 w-4" /> Back to Newsletters
        </Button>
      </div>

      {isLoading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}
      {error && <ErrorState message="Failed to load newsletter" onRetry={refetch} />}

      {newsletter && (
        <>
          <PageHeader title={newsletter.title} />
          <NewsletterDetail newsletter={newsletter} />
        </>
      )}
    </>
  )
}
