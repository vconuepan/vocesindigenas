import type { Feed, Issue } from '@shared/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { formatDate } from '../../lib/constants'

interface FeedTableProps {
  feeds: Feed[]
  issues: Issue[]
  onEdit: (feed: Feed) => void
  onCrawl: (id: string) => void
  onDelete: (id: string) => void
  crawlingId?: string
}

export function FeedTable({ feeds, issues, onEdit, onCrawl, onDelete, crawlingId }: FeedTableProps) {
  const issueMap = new Map(issues.map(i => [i.id, i.name]))

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Title</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">URL</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Issue</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Lang</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Active</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Interval</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Last Crawled</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Selector</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {feeds.map(feed => (
            <tr key={feed.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="px-3 py-2 font-medium text-neutral-900">{feed.title}</td>
              <td className="px-3 py-2 text-neutral-500 max-w-[200px] truncate">
                <a href={feed.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 underline">
                  {feed.url}
                </a>
              </td>
              <td className="px-3 py-2 text-neutral-600">{issueMap.get(feed.issueId) || '—'}</td>
              <td className="px-3 py-2 text-neutral-600">{feed.language}</td>
              <td className="px-3 py-2">
                <Badge variant={feed.active ? 'green' : 'gray'}>
                  {feed.active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-3 py-2 text-neutral-600">{feed.crawlIntervalHours}h</td>
              <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">{formatDate(feed.lastCrawledAt)}</td>
              <td className="px-3 py-2">
                {feed.htmlSelector ? (
                  <Badge variant="blue">CSS</Badge>
                ) : null}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(feed)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => onCrawl(feed.id)} loading={crawlingId === feed.id}>Crawl</Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(feed.id)} className="text-red-600 hover:text-red-700">Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
