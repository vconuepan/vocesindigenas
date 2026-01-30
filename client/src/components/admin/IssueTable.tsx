import type { Issue } from '@shared/types'
import { Button } from '../ui/Button'

interface IssueTableProps {
  issues: Issue[]
  onEdit: (issue: Issue) => void
  onDelete: (id: string) => void
}

/** Sort issues so parents come first (alphabetical), children indented under their parent. */
function buildHierarchicalList(issues: Issue[]): { issue: Issue; isChild: boolean }[] {
  const parents = issues.filter(i => !i.parentId).sort((a, b) => a.name.localeCompare(b.name))
  const childrenByParent = new Map<string, Issue[]>()
  for (const issue of issues) {
    if (issue.parentId) {
      const list = childrenByParent.get(issue.parentId) || []
      list.push(issue)
      childrenByParent.set(issue.parentId, list)
    }
  }

  const rows: { issue: Issue; isChild: boolean }[] = []
  for (const parent of parents) {
    rows.push({ issue: parent, isChild: false })
    const children = childrenByParent.get(parent.id) || []
    children.sort((a, b) => a.name.localeCompare(b.name))
    for (const child of children) {
      rows.push({ issue: child, isChild: true })
    }
  }
  return rows
}

export function IssueTable({ issues, onEdit, onDelete }: IssueTableProps) {
  const rows = buildHierarchicalList(issues)

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Name</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Slug</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Description</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Published</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ issue, isChild }) => (
            <tr key={issue.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="px-3 py-2 font-medium text-neutral-900">
                {isChild && (
                  <span className="text-neutral-400 mr-1.5">└</span>
                )}
                {issue.name}
              </td>
              <td className="px-3 py-2 text-neutral-500 font-mono text-xs">{issue.slug}</td>
              <td className="px-3 py-2 text-neutral-600 max-w-[300px] truncate">{issue.description}</td>
              <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">{issue.publishedStoryCount ?? 0}</td>
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
