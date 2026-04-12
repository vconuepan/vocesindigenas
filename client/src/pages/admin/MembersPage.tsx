import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { adminApi, type MemberUser } from '../../lib/admin-api'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'

const USER_TYPE_TABS = [
  { value: '', label: 'Todos' },
  { value: 'VEEDOR', label: 'Veedores' },
  { value: 'EMPRESA', label: 'Empresas' },
  { value: 'COMUNIDAD_LIDER', label: 'Líderes' },
  { value: 'ADMIN', label: 'Admins' },
]

const TYPE_BADGE: Record<string, string> = {
  VEEDOR: 'bg-sky-50 text-sky-700',
  EMPRESA: 'bg-amber-50 text-amber-700',
  COMUNIDAD_LIDER: 'bg-emerald-50 text-emerald-700',
  ADMIN: 'bg-purple-50 text-purple-700',
}

const TYPE_LABEL: Record<string, string> = {
  VEEDOR: 'Veedor',
  EMPRESA: 'Empresa',
  COMUNIDAD_LIDER: 'Líder Comunitario',
  ADMIN: 'Admin',
}

const COMMUNITY_TYPE_LABEL: Record<string, string> = {
  PUEBLO: 'Pueblo',
  TERRITORIO: 'Territorio',
  CAUSA: 'Causa',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function MemberRow({ member }: { member: MemberUser }) {
  const badge = TYPE_BADGE[member.userType] ?? 'bg-neutral-100 text-neutral-600'
  const label = TYPE_LABEL[member.userType] ?? member.userType

  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50">
      <td className="px-4 py-3">
        <div className="font-medium text-neutral-900 text-sm">{member.name}</div>
        <div className="text-neutral-500 text-xs">{member.email}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
          {label}
        </span>
      </td>
      <td className="px-4 py-3">
        {member.memberships.length === 0 ? (
          <span className="text-neutral-400 text-xs italic">Sin comunidades</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {member.memberships.map((m) => (
              <span
                key={m.community.id}
                className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700"
                title={`${COMMUNITY_TYPE_LABEL[m.community.type]} · Ingresó ${formatDate(m.joinedAt)}`}
              >
                {m.community.name}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
        {formatDate(member.createdAt)}
      </td>
    </tr>
  )
}

export default function MembersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const userType = searchParams.get('userType') ?? ''
  const [page, setPage] = useState(1)

  const summaryQuery = useQuery({
    queryKey: ['admin', 'members', 'summary'],
    queryFn: () => adminApi.members.summary(),
  })

  const listQuery = useQuery({
    queryKey: ['admin', 'members', { userType, page }],
    queryFn: () => adminApi.members.list({ userType: userType || undefined, page, pageSize: 50 }),
  })

  function setTab(value: string) {
    setPage(1)
    setSearchParams(value ? { userType: value } : {})
  }

  const summary = summaryQuery.data
  const result = listQuery.data

  return (
    <>
      <Helmet>
        <title>Miembros — Admin</title>
      </Helmet>

      <PageHeader
        title="Miembros"
        description="Usuarios registrados y sus comunidades"
      />

      {/* Summary cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-bold text-neutral-900">{summary.totalUsers}</div>
            <div className="text-xs text-neutral-500 mt-0.5">Usuarios totales</div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-bold text-neutral-900">{summary.totalMemberships}</div>
            <div className="text-xs text-neutral-500 mt-0.5">Membresías activas</div>
          </div>
          {summary.byCommunity.slice(0, 2).map(({ community, count }) =>
            community ? (
              <div key={community.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="text-2xl font-bold text-green-700">{count}</div>
                <div className="text-xs text-neutral-500 mt-0.5 truncate">{community.name}</div>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-neutral-200">
        {USER_TYPE_TABS.map((tab) => {
          const count = tab.value
            ? summary?.byType.find((t) => t.userType === tab.value)?.count
            : summary?.totalUsers
          const isActive = userType === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tab.label}
              {count !== undefined && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${isActive ? 'bg-brand-100 text-brand-700' : 'bg-neutral-100 text-neutral-500'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      {listQuery.isLoading ? (
        <LoadingSpinner />
      ) : listQuery.isError ? (
        <ErrorState message="No se pudo cargar la lista de miembros" />
      ) : !result?.data.length ? (
        <EmptyState title="No hay usuarios en esta categoría" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide">Comunidades</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wide">Registrado</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
              <span>{result.total} usuarios totales</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50"
                >
                  Anterior
                </button>
                <span className="px-3 py-1">
                  {page} / {result.totalPages}
                </span>
                <button
                  disabled={page === result.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
