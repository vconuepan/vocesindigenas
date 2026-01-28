import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create issues
  const aiTech = await prisma.issue.upsert({
    where: { slug: 'ai-technology' },
    update: {},
    create: {
      name: 'AI & Technology',
      slug: 'ai-technology',
      description: 'Artificial intelligence, machine learning, and emerging technology developments.',
      promptFactors: 'Focus on breakthroughs, policy implications, industry shifts, ethical concerns, and real-world applications of AI and technology.',
      promptAntifactors: 'Ignore product launches without broader significance, routine updates, and marketing hype without substance.',
      promptRatings: 'Rate higher for: original research, policy changes, major deployments, safety developments. Rate lower for: speculation, opinion pieces without data, rehashed announcements.',
    },
  })

  const climate = await prisma.issue.upsert({
    where: { slug: 'climate-environment' },
    update: {},
    create: {
      name: 'Climate & Environment',
      slug: 'climate-environment',
      description: 'Climate change, environmental policy, sustainability, and ecological developments.',
      promptFactors: 'Focus on new scientific findings, policy decisions, measurable environmental changes, and innovative solutions.',
      promptAntifactors: 'Ignore repetitive doom narratives without new data, corporate greenwashing, and vague pledges without accountability.',
      promptRatings: 'Rate higher for: peer-reviewed research, binding policy, measurable impact data. Rate lower for: awareness campaigns, pledges without timelines, opinion without evidence.',
    },
  })

  const health = await prisma.issue.upsert({
    where: { slug: 'global-health' },
    update: {},
    create: {
      name: 'Global Health',
      slug: 'global-health',
      description: 'Public health developments, medical research, healthcare policy, and disease tracking.',
      promptFactors: 'Focus on clinical trial results, WHO/CDC guidance changes, disease outbreaks, healthcare access, and drug approvals.',
      promptAntifactors: 'Ignore preliminary studies hyped as breakthroughs, wellness industry marketing, and single-patient anecdotes.',
      promptRatings: 'Rate higher for: phase 3 trial results, official guidance, epidemiological data. Rate lower for: in-vitro only results, expert opinions without data, conference abstracts.',
    },
  })

  const governance = await prisma.issue.upsert({
    where: { slug: 'society-governance' },
    update: {},
    create: {
      name: 'Society & Governance',
      slug: 'society-governance',
      description: 'Social developments, governance changes, democracy, justice, and institutional reform.',
      promptFactors: 'Focus on legislative changes, court rulings, institutional reforms, social movements with measurable impact, and democratic processes.',
      promptAntifactors: 'Ignore partisan commentary, horse-race politics, personality-driven stories, and outrage bait.',
      promptRatings: 'Rate higher for: enacted legislation, court decisions, verified data. Rate lower for: political speculation, polls without context, op-eds.',
    },
  })

  console.log('Created issues:', aiTech.name, climate.name, health.name, governance.name)

  // Create feeds
  const feeds = await Promise.all([
    prisma.feed.upsert({
      where: { url: 'https://arstechnica.com/ai/feed/' },
      update: {},
      create: {
        title: 'Ars Technica - AI',
        url: 'https://arstechnica.com/ai/feed/',
        issueId: aiTech.id,
      },
    }),
    prisma.feed.upsert({
      where: { url: 'https://www.technologyreview.com/feed/' },
      update: {},
      create: {
        title: 'MIT Technology Review',
        url: 'https://www.technologyreview.com/feed/',
        issueId: aiTech.id,
      },
    }),
    prisma.feed.upsert({
      where: { url: 'https://www.carbonbrief.org/feed/' },
      update: {},
      create: {
        title: 'Carbon Brief',
        url: 'https://www.carbonbrief.org/feed/',
        issueId: climate.id,
      },
    }),
    prisma.feed.upsert({
      where: { url: 'https://www.theguardian.com/environment/rss' },
      update: {},
      create: {
        title: 'The Guardian - Environment',
        url: 'https://www.theguardian.com/environment/rss',
        issueId: climate.id,
      },
    }),
    prisma.feed.upsert({
      where: { url: 'https://www.who.int/rss-feeds/news-english.xml' },
      update: {},
      create: {
        title: 'WHO News',
        url: 'https://www.who.int/rss-feeds/news-english.xml',
        issueId: health.id,
      },
    }),
    prisma.feed.upsert({
      where: { url: 'https://www.statnews.com/feed/' },
      update: {},
      create: {
        title: 'STAT News',
        url: 'https://www.statnews.com/feed/',
        issueId: health.id,
      },
    }),
    prisma.feed.upsert({
      where: { url: 'https://theconversation.com/articles.atom' },
      update: {},
      create: {
        title: 'The Conversation',
        url: 'https://theconversation.com/articles.atom',
        issueId: governance.id,
      },
    }),
    prisma.feed.upsert({
      where: { url: 'https://www.foreignaffairs.com/rss.xml' },
      update: {},
      create: {
        title: 'Foreign Affairs',
        url: 'https://www.foreignaffairs.com/rss.xml',
        issueId: governance.id,
      },
    }),
  ])

  console.log(`Created ${feeds.length} feeds`)

  // Create default job runs (all disabled)
  const jobs = await Promise.all([
    prisma.jobRun.upsert({
      where: { jobName: 'crawl_feeds' },
      update: {},
      create: {
        jobName: 'crawl_feeds',
        cronExpression: '0 */6 * * *',
        enabled: false,
      },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'preassess_stories' },
      update: {},
      create: {
        jobName: 'preassess_stories',
        cronExpression: '0 1,7,13,19 * * *',
        enabled: false,
      },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'assess_stories' },
      update: {},
      create: {
        jobName: 'assess_stories',
        cronExpression: '0 9,21 * * *',
        enabled: false,
      },
    }),
    prisma.jobRun.upsert({
      where: { jobName: 'select_stories' },
      update: {},
      create: {
        jobName: 'select_stories',
        cronExpression: '0 10 * * *',
        enabled: false,
      },
    }),
  ])

  console.log(`Created ${jobs.length} job runs`)

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
