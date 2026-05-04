import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  useEditorial,
  useUpdateEditorial,
  useGenerateEditorial,
  usePublishEditorial,
  useUnpublishEditorial,
  useEditorialLinkedIn,
} from '../../hooks/useEditorials'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

export default function EditorialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: editorial, isLoading, error, refetch } = useEditorial(id || '')
  const updateEditorial = useUpdateEditorial()
  const generateEditorial = useGenerateEditorial()
  const publishEditorial = usePublishEditorial()
  const unpublishEditorial = useUnpublishEditorial()
  const getLinkedIn = useEditorialLinkedIn()

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [contentDraft, setContentDraft] = useState('')
  const [editingContent, setEditingContent] = useState(false)
  const [linkedInText, setLinkedInText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>
  if (error || !editorial) return <ErrorState message="Error al cargar editorial" onRetry={refetch} />

  const isDraft = editorial.status === 'draft'

  const handleSaveTitle = async () => {
    try {
      await updateEditorial.mutateAsync({ id: editorial.id, data: { title: titleDraft } })
      setEditingTitle(false)
      toast('success', 'Título actualizado')
    } catch {
      toast('error', 'Error al guardar título')
    }
  }

  const handleSaveContent = async () => {
    try {
      await updateEditorial.mutateAsync({ id: editorial.id, data: { content: contentDraft } })
      setEditingContent(false)
      toast('success', 'Editorial guardada')
    } catch {
      toast('error', 'Error al guardar editorial')
    }
  }

  const handleGenerate = async () => {
    try {
      await generateEditorial.mutateAsync(editorial.id)
      toast('success', 'Editorial generada — revisa y ajusta antes de publicar')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Error al generar editorial')
    }
  }

  const handlePublish = async () => {
    try {
      await publishEditorial.mutateAsync(editorial.id)
      toast('success', 'Editorial publicada en Voces Indígenas')
    } catch {
      toast('error', 'Error al publicar')
    }
  }

  const handleUnpublish = async () => {
    try {
      await unpublishEditorial.mutateAsync(editorial.id)
      toast('success', 'Editorial despublicada')
    } catch {
      toast('error', 'Error al despublicar')
    }
  }

  const handleCopyLinkedIn = async () => {
    try {
      const result = await getLinkedIn.mutateAsync(editorial.id)
      setLinkedInText(result.text)
    } catch {
      toast('error', 'Error al formatear para LinkedIn')
    }
  }

  const handleCopy = async () => {
    if (!linkedInText) return
    await navigator.clipboard.writeText(linkedInText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Helmet>
        <title>{editorial.title} — Voces Indígenas — Admin</title>
      </Helmet>

      <div className="max-w-3xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/editorials')}
            className="text-sm text-neutral-500 hover:text-neutral-700 mt-1"
          >
            ← Voces Indígenas
          </button>
          <div className="flex gap-2 flex-wrap justify-end">
            {isDraft && editorial.content && (
              <Button
                onClick={handlePublish}
                disabled={publishEditorial.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {publishEditorial.isPending ? 'Publicando…' : 'Publicar'}
              </Button>
            )}
            {!isDraft && (
              <Button
                variant="secondary"
                onClick={handleUnpublish}
                disabled={unpublishEditorial.isPending}
              >
                {unpublishEditorial.isPending ? 'Despublicando…' : 'Volver a borrador'}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleGenerate}
              disabled={generateEditorial.isPending}
            >
              {generateEditorial.isPending ? 'Generando…' : 'Regenerar con IA'}
            </Button>
          </div>
        </div>

        {/* Status badge */}
        <div className="mb-4">
          {isDraft ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              Borrador
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Publicado{editorial.publishedAt ? ` · ${new Date(editorial.publishedAt).toLocaleDateString('es-CL')}` : ''}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="mb-6">
          {editingTitle ? (
            <div className="flex gap-2 items-start">
              <input
                className="flex-1 text-2xl font-bold border border-neutral-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle() }}
                autoFocus
              />
              <Button onClick={handleSaveTitle} disabled={updateEditorial.isPending}>Guardar</Button>
              <Button variant="secondary" onClick={() => setEditingTitle(false)}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <h1 className="text-2xl font-bold text-neutral-900 flex-1">{editorial.title}</h1>
              <button
                onClick={() => { setTitleDraft(editorial.title); setEditingTitle(true) }}
                className="text-xs text-neutral-400 hover:text-neutral-600 mt-1 shrink-0"
              >
                Editar título
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-6">
          {!editorial.content && !generateEditorial.isPending && (
            <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-lg">
              <p className="text-neutral-500 mb-4">La editorial aún no tiene contenido.</p>
              <Button onClick={handleGenerate}>Generar con IA</Button>
            </div>
          )}

          {generateEditorial.isPending && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <LoadingSpinner />
              <p className="text-sm text-neutral-500">Generando editorial en tu voz…</p>
            </div>
          )}

          {editorial.content && !generateEditorial.isPending && (
            editingContent ? (
              <div className="flex flex-col gap-3">
                <textarea
                  className="w-full min-h-[480px] border border-neutral-300 rounded p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  value={contentDraft}
                  onChange={e => setContentDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveContent} disabled={updateEditorial.isPending}>
                    {updateEditorial.isPending ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingContent(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div className="prose prose-neutral max-w-none text-neutral-800 leading-relaxed whitespace-pre-wrap text-base">
                  {editorial.content}
                </div>
                <button
                  onClick={() => { setContentDraft(editorial.content); setEditingContent(true) }}
                  className="absolute top-0 right-0 text-xs text-neutral-400 hover:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Editar
                </button>
              </div>
            )
          )}
        </div>

        {/* LinkedIn */}
        {editorial.content && (
          <div className="border-t border-neutral-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-neutral-700">Copiar para LinkedIn</h2>
              <Button variant="secondary" onClick={handleCopyLinkedIn} disabled={getLinkedIn.isPending}>
                {getLinkedIn.isPending ? 'Preparando…' : 'Generar texto LinkedIn'}
              </Button>
            </div>

            {linkedInText && (
              <div className="relative">
                <pre className="text-sm bg-neutral-50 border border-neutral-200 rounded p-4 whitespace-pre-wrap leading-relaxed text-neutral-700 max-h-64 overflow-y-auto">
                  {linkedInText}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 text-xs bg-white border border-neutral-200 rounded px-2 py-1 hover:bg-neutral-50 transition-colors"
                >
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
