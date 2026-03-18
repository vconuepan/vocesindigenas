import { createLogger } from '../lib/logger.js'
import prisma from '../lib/prisma.js'
import { getLLMByTier, rateLimitDelay } from '../services/llm.js'
import { HumanMessage } from '@langchain/core/messages'
import { generateHtmlContent } from '../services/newsletter.js'
import * as plunk from '../services/plunk.js'

const log = createLogger('send_fpic_newsletter')

const FPIC_EMAIL = process.env.FPIC_NEWSLETTER_EMAIL || 'venancio@conuepan.cl'

// Lookback: 7 days — FPIC stories are less frequent, broader window needed
const LOOKBACK_DAYS = 7

export async function runSendFpicNewsletter(): Promise<void> {
  log.info('starting FPIC newsletter job')

  // Skip if already sent today
  const today = new Date()
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)

  const existing = await prisma.newsletter.findFirst({
    where: {
      title: { contains: '[CLPI]' },
      createdAt: { gte: startOfDay },
      status: 'published',
    },
  })
  if (existing) {
    log.info('FPIC newsletter already sent today, skipping')
    return
  }

  // Fetch published stories from last 7 days across all categories
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const stories = await prisma.story.findMany({
    where: {
      status: 'published',
      datePublished: { gte: since },
      relevance: { gte: 5 },
      title: { not: null },
      summary: { not: null },
    },
    select: {
      id: true,
      title: true,
      sourceTitle: true,
      sourceUrl: true,
      slug: true,
      summary: true,
      relevanceSummary: true,
      relevanceReasons: true,
      marketingBlurb: true,
      quote: true,
      quoteAttribution: true,
      relevance: true,
      issue: { select: { name: true, slug: true } },
      feed: { select: { title: true, displayTitle: true } },
    },
    orderBy: { relevance: 'desc' },
    take: 80,
  })

  if (stories.length === 0) {
    log.info('no stories found for FPIC newsletter')
    return
  }

  // Use LLM to select only FPIC-relevant stories
  const llm = getLLMByTier('large')
  const storiesJson = stories.map(s => ({
    id: s.id,
    title: s.title || s.sourceTitle,
    summary: s.summary,
    relevanceReasons: s.relevanceReasons,
    issue: s.issue?.name || s.feed?.title || 'General',
    relevance: s.relevance,
  }))

  const selectionPrompt = `Eres un experto en derechos indígenas con especialización en Consentimiento Libre, Previo e Informado (CLPI / FPIC en inglés).

Tu tarea es seleccionar ÚNICAMENTE las noticias que tengan relación directa con el CLPI o FPIC, en cualquiera de estas formas:
- Procesos de consulta indígena o CLPI aplicados o incumplidos
- Sentencias, fallos judiciales o precedentes legales sobre CLPI/FPIC
- Casos de empresas (mineras, energéticas, forestales, acuícolas, etc.) con o sin consulta previa
- Acuerdos o negociaciones entre Estados, empresas y comunidades indígenas que involucren CLPI
- Marcos legales, políticas públicas o normas internacionales sobre CLPI (Convenio 169 OIT, UNDRIP, etc.)
- Conflictos territoriales donde el CLPI sea un factor relevante
- Experiencias o modelos de buenas prácticas de CLPI a nivel global

INSTRUCCIONES:
- Incluye SOLO noticias con conexión real al CLPI/FPIC — aunque no usen esas palabras exactas
- Excluye noticias genéricas sobre derechos indígenas, clima o empresas sin vínculo al CLPI
- Selecciona entre 4 y 8 noticias — si hay menos relevantes, selecciona menos; no fuerces la cantidad
- Prioriza casos concretos (sentencias, proyectos específicos, acuerdos) sobre noticias generales

Noticias disponibles:
${JSON.stringify(storiesJson, null, 2)}

Responde SOLO con JSON sin texto adicional:
{"selectedIds": ["id1", "id2", ...], "reasoning": "explicación breve de criterio de selección"}`

  await rateLimitDelay()
  const response = await llm.invoke([new HumanMessage(selectionPrompt)])
  const responseText = response.content as string

  let selectedIds: string[] = []
  try {
    const clean = responseText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    selectedIds = parsed.selectedIds || []
    log.info({ reasoning: parsed.reasoning, count: selectedIds.length }, 'LLM FPIC selection')
  } catch {
    log.warn('failed to parse LLM response, falling back to top stories')
    selectedIds = stories.slice(0, 6).map(s => s.id)
  }

  const validIds = selectedIds.filter(id => stories.find(s => s.id === id))
  if (validIds.length === 0) {
    log.info('no FPIC-relevant stories found this period, skipping send')
    return
  }

  // Create newsletter
  const dateLabel = today.toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const title = `[CLPI] Radar FPIC — ${dateLabel}`

  const newsletter = await prisma.newsletter.create({
    data: { title, storyIds: validIds, selectedStoryIds: validIds },
  })

  // Fetch full story data for content generation
  const selectedStories = await prisma.story.findMany({
    where: { id: { in: validIds } },
    select: {
      id: true, title: true, sourceTitle: true, sourceUrl: true, slug: true,
      summary: true, relevanceSummary: true, marketingBlurb: true,
      quote: true, quoteAttribution: true, relevance: true,
      issue: { select: { name: true, slug: true } },
      feed: { select: { title: true, displayTitle: true } },
    },
    orderBy: { relevance: 'desc' },
  })

  // Build markdown content
  let content = `**Radar FPIC / CLPI — ${dateLabel}**\n\n`
  content += `Selección de noticias sobre Consentimiento Libre, Previo e Informado de los últimos ${LOOKBACK_DAYS} días.\n\n---\n\n`

  for (const story of selectedStories) {
    const publisher = story.feed?.displayTitle || story.feed?.title || 'Fuente'
    const analysisUrl = story.slug ? `https://impactoindigena.news/stories/${story.slug}` : null
    const issueLabel = story.issue?.name || ''

    content += `## ${story.title || story.sourceTitle}\n`
    content += `${publisher}`
    if (issueLabel) content += ` · ${issueLabel}`
    content += ` · [artículo original](${story.sourceUrl})`
    if (analysisUrl) content += ` · [análisis](${analysisUrl})`
    content += `\n\n`

    const body = story.relevanceSummary || story.marketingBlurb || story.summary || ''
    if (body) content += `${body}\n\n`
    if (story.quote && story.quoteAttribution) {
      content += `> "${story.quote}"\n> — ${story.quoteAttribution}\n\n`
    }
    content += `---\n\n`
  }

  await prisma.newsletter.update({
    where: { id: newsletter.id },
    data: { content: content.trim(), selectedStoryIds: validIds },
  })

  await generateHtmlContent(newsletter.id)

  const updated = await prisma.newsletter.findUnique({ where: { id: newsletter.id } })
  if (!updated?.html) throw new Error('No HTML generated for FPIC newsletter')

  await plunk.sendTransactional({
    to: FPIC_EMAIL,
    subject: title,
    body: updated.html,
  })

  await prisma.newsletter.update({
    where: { id: newsletter.id },
    data: { status: 'published' },
  })

  log.info({ newsletterId: newsletter.id, storyCount: validIds.length }, 'FPIC newsletter sent')
}
