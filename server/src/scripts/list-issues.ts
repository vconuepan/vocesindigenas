import prisma from '../lib/prisma.js'

async function main() {
  const issues = await prisma.issue.findMany({
    select: { id: true, name: true, slug: true, parentId: true },
    orderBy: { name: 'asc' }
  })
  issues.forEach(i => console.log(i.parentId ? '  child' : 'ROOT ', i.id, '|', i.slug, '|', i.name))
  await prisma.$disconnect()
}

main()
