/**
 * Skeleton placeholder for IssueAccordion on IssuesPage.
 * Matches the collapsed accordion state.
 */
export default function IssueAccordionSkeleton() {
  return (
    <div className="animate-pulse py-4">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 bg-neutral-200 rounded" />
        <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
        <div className="h-5 bg-neutral-200 rounded w-48" />
      </div>
    </div>
  )
}
