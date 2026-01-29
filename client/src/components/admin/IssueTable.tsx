import type { Issue } from '@shared/types'
import { Button } from '../ui/Button'
import { formatDate } from '../../lib/constants'

interface IssueTableProps {
  issues: Issue[]
  onEdit: (issue: Issue) => void
  onDelete: (id: string) => void
}

export function IssueTable({ issues, onEdit, onDelete }: IssueTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Name</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Slug</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Description</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Created</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {issues.map(issue => (
            <tr key={issue.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="px-3 py-2 font-medium text-neutral-900">{issue.name}</td>
              <td className="px-3 py-2 text-neutral-500 font-mono text-xs">{issue.slug}</td>
              <td className="px-3 py-2 text-neutral-600 max-w-[300px] truncate">{issue.description}</td>
              <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">{formatDate(issue.createdAt)}</td>
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(issue)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(issue.id)} className="text-red-600 hover:text-red-700">Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
