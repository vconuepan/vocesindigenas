import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useMutation } from '@tanstack/react-query'
import { adminApi } from '../../lib/admin-api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

interface JobResult {
  ok?: boolean
  total?: number
  updated?: number
  skipped?: number
  message?: string
  error?: string
  [key: string]: unknown
}

function JobCard({
  title,
  description,
  buttonLabel,
  onRun,
  isPending,
  result,
}: {
  title: string
  description: string
  buttonLabel: string
  onRun: () => void
  isPending: boolean
  result: JobResult | null
}) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-neutral-900 mb-1">{title}</h3>
          <p className="text-sm text-neutral-500">{description}</p>
          {result && (
            <div className={`mt-3 rounded-md px-3 py-2 text-sm ${result.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {result.error ? (
                <span>Error: {result.error}</span>
              ) : (
                <span>
                  {result.message
                    ? result.message
                    : result.total !== undefined
                    ? `Total: ${result.total}${result.updated !== undefined ? `, actualizados: ${result.updated}` : ''}${result.skipped !== undefined ? `, omitidos: ${result.skipped}` : ''}`
                    : JSON.stringify(result)}
                </span>
              )}
            </div>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRun}
          loading={isPending}
          className="shrink-0"
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}

export default function MaintenancePage() {
  const { toast } = useToast()

  const [backfillImagesResult, setBackfillImagesResult] = useState<JobResult | null>(null)
  const [backfillTitlesResult, setBackfillTitlesResult] = useState<JobResult | null>(null)
  const [storySlug, setStorySlug] = useState('')
  const [storyStatusResult, setStoryStatusResult] = useState<JobResult | null>(null)
  const [republishResult, setRepublishResult] = useState<JobResult | null>(null)

  const backfillImages = useMutation({
    mutationFn: () => adminApi.maintenance.backfillImages(),
    onSuccess: (data) => {
      setBackfillImagesResult(data)
      toast('success', `Imágenes: ${data.updated} actualizadas, ${data.skipped} omitidas`)
    },
    onError: (err: Error) => {
      setBackfillImagesResult({ error: err.message })
      toast('error', 'Error al actualizar imágenes')
    },
  })

  const backfillTitles = useMutation({
    mutationFn: () => adminApi.maintenance.backfillTitles(),
    onSuccess: (data) => {
      setBackfillTitlesResult(data)
      toast('success', `Reescritura iniciada: ${data.total} historias en cola`)
    },
    onError: (err: Error) => {
      setBackfillTitlesResult({ error: err.message })
      toast('error', 'Error al iniciar reescritura')
    },
  })

  const checkStory = useMutation({
    mutationFn: () => adminApi.maintenance.storyStatus(storySlug),
    onSuccess: (data) => setStoryStatusResult(data),
    onError: (err: Error) => setStoryStatusResult({ error: err.message }),
  })

  const republishStory = useMutation({
    mutationFn: () => adminApi.maintenance.republishSlug(storySlug),
    onSuccess: (data) => {
      setRepublishResult(data)
      toast('success', `Historia republicada: ${data.slug}`)
    },
    onError: (err: Error) => {
      setRepublishResult({ error: err.message })
      toast('error', 'Error al republicar')
    },
  })

  return (
    <>
      <Helmet>
        <title>Mantenimiento — Admin — Impacto Indígena</title>
      </Helmet>

      <PageHeader title="Mantenimiento" description="Trabajos de limpieza y corrección de datos" />

      <div className="space-y-6">

        {/* Batch jobs */}
        <Card title="Trabajos en lote">
          <div className="space-y-3">
            <JobCard
              title="Rellenar imágenes faltantes"
              description="Extrae og:image de artículos fuente para historias publicadas sin imagen. Corre de forma sincrónica — puede tardar varios minutos."
              buttonLabel="Ejecutar"
              onRun={() => backfillImages.mutate()}
              isPending={backfillImages.isPending}
              result={backfillImagesResult}
            />
            <JobCard
              title="Reescribir títulos (historias antiguas)"
              description="Reescribe títulos y etiquetas en tiempo pasado para historias publicadas hace más de 3 meses. Corre en background — revisa los logs del servidor para ver el progreso."
              buttonLabel="Iniciar"
              onRun={() => backfillTitles.mutate()}
              isPending={backfillTitles.isPending}
              result={backfillTitlesResult}
            />
          </div>
        </Card>

        {/* Story by slug */}
        <Card title="Herramientas por slug">
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="story-slug">
              Slug de la historia
            </label>
            <input
              id="story-slug"
              type="text"
              value={storySlug}
              onChange={(e) => {
                setStorySlug(e.target.value)
                setStoryStatusResult(null)
                setRepublishResult(null)
              }}
              placeholder="ej. temucuicui-denuncia-demora-en-huracan"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => checkStory.mutate()}
              disabled={!storySlug.trim()}
              loading={checkStory.isPending}
            >
              Verificar estado
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => republishStory.mutate()}
              disabled={!storySlug.trim()}
              loading={republishStory.isPending}
            >
              Forzar publicación
            </Button>
          </div>

          {storyStatusResult && (
            <div className={`mt-4 rounded-md px-3 py-2 text-sm font-mono ${storyStatusResult.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-neutral-50 text-neutral-700 border border-neutral-200'}`}>
              {JSON.stringify(storyStatusResult, null, 2)}
            </div>
          )}
          {republishResult && !storyStatusResult && (
            <div className={`mt-4 rounded-md px-3 py-2 text-sm font-mono ${republishResult.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {JSON.stringify(republishResult, null, 2)}
            </div>
          )}
        </Card>

      </div>
    </>
  )
}
