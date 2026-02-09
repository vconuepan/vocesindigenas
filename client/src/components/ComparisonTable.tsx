import { type ReactNode, useState } from 'react'

type CellValue = string | { text: string; check?: boolean }

function getCellText(cell: CellValue): string {
  return typeof cell === 'string' ? cell : cell.text
}

function getCellCheck(cell: CellValue): boolean {
  return typeof cell !== 'string' && !!cell.check
}

function CellContent({ cell }: { cell: CellValue }) {
  const text = getCellText(cell)
  const check = getCellCheck(cell)

  return (
    <>
      {check && (
        <svg
          className="inline-block w-4 h-4 text-green-600 mr-1 -mt-0.5 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {text}
    </>
  )
}

interface ComparisonTableProps {
  /** Column headers (first entry is the feature column label, rest are competitor names) */
  headers: string[]
  /** Table rows — feature name + one cell per competitor */
  rows: { feature: string; cells: CellValue[] }[]
  /** 0-based index of the column to highlight (excludes the feature column) */
  highlightColumn?: number
  /** Optional ReactNode (e.g. a <select>) to render in the last column header instead of plain text */
  competitorSelect?: ReactNode
}

export default function ComparisonTable({ headers, rows, highlightColumn, competitorSelect }: ComparisonTableProps) {
  const [cardView, setCardView] = useState(false)
  const competitorHeaders = headers.slice(1)

  return (
    <div>
      {/* Mobile view toggle */}
      <div className="flex justify-end mb-3 md:hidden">
        <div className="inline-flex rounded-lg border border-neutral-300 text-sm" role="radiogroup" aria-label="Table view mode">
          <button
            role="radio"
            aria-checked={!cardView}
            onClick={() => setCardView(false)}
            className={`px-3 py-1.5 rounded-l-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
              !cardView ? 'bg-brand-700 text-white' : 'text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            Table
          </button>
          <button
            role="radio"
            aria-checked={cardView}
            onClick={() => setCardView(true)}
            className={`px-3 py-1.5 rounded-r-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
              cardView ? 'bg-brand-700 text-white' : 'text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            Cards
          </button>
        </div>
      </div>

      {/* Card view — mobile only */}
      {cardView && (
        <div className="md:hidden space-y-6">
          {competitorHeaders.map((competitor, colIdx) => {
            const isHighlighted = colIdx === highlightColumn
            return (
              <div
                key={competitor}
                className={`rounded-xl border p-4 ${
                  isHighlighted
                    ? 'border-brand-300 bg-brand-50/50 ring-1 ring-brand-200'
                    : 'border-neutral-200'
                }`}
              >
                <h3 className={`font-bold text-lg mb-3 ${isHighlighted ? 'text-brand-800' : ''}`}>
                  {colIdx === competitorHeaders.length - 1 && competitorSelect ? competitorSelect : competitor}
                </h3>
                <dl className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.feature} className="flex flex-col">
                      <dt className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                        {row.feature}
                      </dt>
                      <dd className="text-sm text-neutral-700 mt-0.5">
                        <CellContent cell={row.cells[colIdx]} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )
          })}
        </div>
      )}

      {/* Table view — always visible on desktop, toggleable on mobile */}
      <div className={`${cardView ? 'hidden md:block' : ''}`}>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm border-collapse min-w-[640px] table-fixed">
            <colgroup>
              <col className="w-[20%]" />
              {competitorHeaders.map((_, i) => (
                <col key={i} className="w-[40%]" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-neutral-100 text-left py-3 px-3 font-bold text-neutral-700 border-b border-neutral-300"
                >
                  {headers[0]}
                </th>
                {competitorHeaders.map((header, i) => {
                  const isHighlighted = i === highlightColumn
                  const isLast = i === competitorHeaders.length - 1
                  return (
                    <th
                      key={header}
                      scope="col"
                      className={`text-left py-3 px-3 font-bold border-b border-neutral-300 ${
                        isHighlighted
                          ? 'bg-brand-50 text-brand-800 border-b-brand-300'
                          : 'bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      {isLast && competitorSelect ? competitorSelect : header}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={row.feature} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                  <td className="sticky left-0 z-10 bg-inherit py-2.5 px-3 font-medium text-neutral-800 border-b border-neutral-200">
                    {row.feature}
                  </td>
                  {row.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={`py-2.5 px-3 border-b border-neutral-200 ${
                        i === highlightColumn ? 'bg-brand-50/60 text-neutral-800' : 'text-neutral-600'
                      }`}
                    >
                      <CellContent cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
