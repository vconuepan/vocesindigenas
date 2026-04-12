import { Helmet } from 'react-helmet-async'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type AdminCommunity } from '../../lib/admin-api'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { useToast } from '../../components/ui/Toast'

const TYPE_LABEL: Record<string, string> = {
  PUEBLO: 'Pueblo',
  TERRITORIO: 'Territorio',
  CAUSA: 'Causa',
}

const TYPE_BADGE: Record<string, string> = {
  PUEBLO: 'bg-emerald-50 text-emerald-700',
  TERRITORIO: 'bg-sky-50 text-sky-700',
  CAUSA: 'bg-amber-50 text-amber-700',
}

function ActiveToggle({ community }: { community: AdminCommunity }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: (active: boolean) => adminApi.communities.toggleActive(community.id, active),
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminCommunity[]>(['admin', 'communities'], (prev) =>
        prev?.map((c) => (c.id === updated.id ? updated : c))
      )
      toast('success', updated.active ? `${updated.name} activada` : `${updated.name} desactivada`)
    },
    onError: () => toast('error', 'Error al actualizar la comunidad'),
  })

  return (
    <button
      role="switch"
      aria-checked={community.active}
      aria-label={community.active ? 'Desactivar comunidad' : 'Activar comunidad'}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(!community.active)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 ${
        community.active ? 'bg-brand-600' : 'bg-neutral-300'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          community.active ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function CommunitiesAdminPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'communities'],
    queryFn: () => adminApi.communities.list(),
  })

  return (
    <>
      <Helmet>
        <title>Comunidades — Admin</title>
      </Helmet>

      <PageHeader
        title="Comunidades"
        description="Activa o desactiva comunidades para controlar su visibilidad pública"
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorState message="No se pudo cargar la lista de comunidades" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide">Comunidad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wide">Miembros</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wide">Activa</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((community) => (
                <tr
                  key={community.id}
                  className={`border-b border-neutral-100 ${!community.active ? 'opacity-50' : 'hover:bg-neutral-50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{community.name}</div>
                    {community.region && (
                      <div className="text-xs text-neutral-400">{community.region}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[community.type] ?? 'bg-neutral-100 text-neutral-600'}`}>
                      {TYPE_LABEL[community.type] ?? community.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600">
                    {community._count.members}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActiveToggle community={community} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
