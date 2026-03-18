/**
 * consolidate-issues.js
 *
 * Merges duplicate issues created by old seed runs into the canonical issues
 * (those with the correct slugs used by the homepage).
 *
 * For each old slug → new slug mapping:
 *   1. If only the old slug exists → renames it to the new slug.
 *   2. If both exist → reassigns all feeds and stories from old to new, then deletes old.
 *   3. If only the new slug exists → nothing to do.
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   node server/prisma/consolidate-issues.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const SLUG_MAPPINGS = [
  { oldSlug: 'clima-biodiversidad',           newSlug: 'cambio-climatico' },
  { oldSlug: 'empresas-derechos-humanos',     newSlug: 'derechos-indigenas' },
  { oldSlug: 'emprendimiento-indigena',       newSlug: 'desarrollo-sostenible-y-autodeterminado' },
  { oldSlug: 'reconciliacion-paz',            newSlug: 'reconciliacion-y-paz' },
]

async function main() {
  console.log('=== consolidate-issues ===\n')

  for (const { oldSlug, newSlug } of SLUG_MAPPINGS) {
    const [oldIssue, newIssue] = await Promise.all([
      prisma.issue.findUnique({ where: { slug: oldSlug } }),
      prisma.issue.findUnique({ where: { slug: newSlug } }),
    ])

    if (!oldIssue) {
      console.log(`[SKIP] No issue with slug '${oldSlug}' found.`)
      continue
    }

    if (!newIssue) {
      // Only old slug exists → just rename it
      console.log(`[RENAME] '${oldSlug}' → '${newSlug}'`)
      await prisma.issue.update({
        where: { id: oldIssue.id },
        data: { slug: newSlug },
      })
      console.log(`  Done.\n`)
      continue
    }

    // Both exist → merge old into new
    console.log(`[MERGE] '${oldSlug}' (${oldIssue.id}) → '${newSlug}' (${newIssue.id})`)

    const [feedsUpdated, storiesUpdated] = await Promise.all([
      prisma.feed.updateMany({
        where: { issueId: oldIssue.id },
        data: { issueId: newIssue.id },
      }),
      prisma.story.updateMany({
        where: { issueId: oldIssue.id },
        data: { issueId: newIssue.id },
      }),
    ])

    console.log(`  Feeds reassigned:   ${feedsUpdated.count}`)
    console.log(`  Stories reassigned: ${storiesUpdated.count}`)

    await prisma.issue.delete({ where: { id: oldIssue.id } })
    console.log(`  Old issue deleted.\n`)
  }

  // Summary: show all remaining issues
  const remaining = await prisma.issue.findMany({
    select: { slug: true, name: true },
    orderBy: { slug: 'asc' },
  })
  console.log('=== Issues in DB after consolidation ===')
  remaining.forEach((i) => console.log(`  ${i.slug}  →  ${i.name}`))
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
