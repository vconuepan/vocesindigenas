import type { Newsletter } from '@shared/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { formatDate } from '../../lib/constants'

interface NewsletterTableProps {
  newsletters: Newsletter[]
  onView: (id: string) => void
  onDelete: (id: string) => void
}

export function NewsletterTable({ newsletters, onView, onDelete }: NewsletterTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Title</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Stories</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Created</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {newsletters.map(nl => (
            <tr key={nl.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="px-3 py-2">
                <button onClick={() => onView(nl.id)} className="font-medium text-neutral-900 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
                  {nl.title}
                </button>
              </td>
              <td className="px-3 py-2">
                <Badge variant={nl.status === 'published' ? 'green' : 'gray'}>
                  {nl.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
              </td>
              <td className="px-3 py-2 text-neutral-600">{nl.storyIds.length}</td>
              <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">{formatDate(nl.createdAt)}</td>
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onView(nl.id)}>View</Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(nl.id)} className="text-red-600 hover:text-red-700">Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
