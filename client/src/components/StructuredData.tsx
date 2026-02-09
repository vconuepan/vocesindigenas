/**
 * Renders one or more JSON-LD structured data scripts.
 * Usage: <StructuredData data={schema} /> or <StructuredData data={[schema1, schema2]} />
 */
export default function StructuredData({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const items = Array.isArray(data) ? data : [data]
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  )
}
