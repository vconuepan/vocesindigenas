import { createLogger } from '../lib/logger.js'
import prisma from '../lib/prisma.js'
import { getLLMByTier, rateLimitDelay } from '../services/llm.js'
import { HumanMessage } from '@langchain/core/messages'
import { generateHtmlContent } from '../services/newsletter.js'
import * as plunk from '../services/plunk.js'

const log = createLogger('send_acuicultura_newsletter')

const ACUICULTURA_EMAIL = process.env.ACUICULTURA_NEWSLETTER_EMAIL || 'venancio@conuepan.cl'

// Lookback: 7 days — tema específico, ventana amplia para asegurar candidatos
const LOOKBACK_DAYS = 7

export async function runSendAcuiculturaNewsletter(): Promise<void> {
  log.info('starting acuicultura newsletter job')

  // Skip si ya se envió hoy
  const today = new Date()
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)

  const existing = await prisma.newsletter.findFirst({
    where: {
      title: { contains: '[ACUICULTURA]' },
      createdAt: { gte: startOfDay },
      status: 'published',
    },
  })
  if (existing) {
    log.info('acuicultura newsletter already sent today, skipping')
    return
  }

  // Buscar noticias publicadas en los últimos 7 días
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
    log.info('no stories found for acuicultura newsletter')
    return
  }

  // LLM selecciona solo noticias vinculadas a acuicultura y pueblos indígenas
  const llm = getLLMByTier('large')
  const storiesJson = stories.map(s => ({
    id: s.id,
    title: s.title || s.sourceTitle,
    summary: s.summary,
    relevanceReasons: s.relevanceReasons,
    issue: s.issue?.name || s.feed?.title || 'General',
    relevance: s.relevance,
  }))

  const selectionPrompt = `Eres un experto en derechos indígenas con especialización en la industria acuícola, pesca y derechos costeros de pueblos indígenas.

Tu tarea es seleccionar ÚNICAMENTE las noticias que tengan relación directa con la acuicultura y los pueblos indígenas, incluyendo cualquiera de estos temas:

- Industria acuícola (salmonicultura, mitilicultura, pesca industrial) y su impacto en territorios o comunidades indígenas
- Ley Lafkenche (Ley 20.249) y Espacios Costeros Marinos de Pueblos Originarios (ECMPO) en Chile
- Certificaciones de sostenibilidad acuícola (ASC, MSC, Friend of the Sea) y su relación con pueblos indígenas o comunidades costeras
- Derechos de pesca, uso de borde costero y recursos marinos de comunidades indígenas a nivel global
- Conflictos entre empresas acuícolas o pesqueras y comunidades indígenas (contaminación, desplazamiento, acceso a recursos)
- Consulta indígena o CLPI aplicado a proyectos acuícolas o concesiones marítimas
- Pueblos indígenas con economías basadas en la pesca: mapuche lafkenche, kawésqar, yagán, māori, inuit, haida u otros
- Marcos legales, políticas públicas o sentencias judiciales sobre derechos marítimos indígenas
- Debates sobre acuicultura sostenible en territorios costeros indígenas

INSTRUCCIONES:
- Incluye SOLO noticias con conexión real a acuicultura/pesca Y pueblos indígenas — aunque no usen esas palabras exactas
- Excluye noticias de acuicultura sin vínculo indígena, y noticias indígenas sin vínculo costero/acuícola
- Selecciona entre 4 y 8 noticias — si hay menos relevantes, selecciona menos; no fuerces la cantidad
- Prioriza Chile, Latinoamérica, Nueva Zelanda, Canadá, Noruega cuando el contexto sea similar

Noticias disponibles:
${JSON.stringify(storiesJson, null, 2)}

Responde SOLO con JSON sin texto adicional:
{"selectedIds": ["id1", "id2", ...], "reasoning": "explicación breve del criterio de selección"}`

  await rateLimitDelay()
  const response = await llm.invoke([new HumanMessage(selectionPrompt)])
  const responseText = response.content as string

  let selectedIds: string[] = []
  try {
    const clean = responseText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    selectedIds = parsed.selectedIds || []
    log.info({ reasoning: parsed.reasoning, count: selectedIds.length }, 'LLM acuicultura selection')
  } catch {
    log.warn('failed to parse LLM response, falling back to top stories')
    selectedIds = stories.slice(0, 6).map(s => s.id)
  }

  const validIds = selectedIds.filter(id => stories.find(s => s.id === id))
  if (validIds.length === 0) {
    log.info('no acuicultura-relevant stories found this period, skipping send')
    return
  }

  // Crear newsletter
  const dateLabel = today.toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const title = `[ACUICULTURA] Radar Acuicultura Indígena — ${dateLabel}`

  const newsletter = await prisma.newsletter.create({
    data: { title, storyIds: validIds, selectedStoryIds: validIds },
  })

  // Obtener datos completos de las noticias seleccionadas
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

  // Construir contenido markdown
  let content = `**Radar Acuicultura Indígena — ${dateLabel}**\n\n`
  content += `Selección de noticias sobre industria acuícola, Ley Lafkenche, certificaciones ASC/MSC y derechos marítimos de pueblos indígenas — últimos ${LOOKBACK_DAYS} días.\n\n---\n\n`

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
  if (!updated?.html) throw new Error('No HTML generated for acuicultura newsletter')

  await plunk.sendTransactional({
    to: ACUICULTURA_EMAIL,
    subject: title,
    body: updated.html,
  })

  await prisma.newsletter.update({
    where: { id: newsletter.id },
    data: { status: 'published' },
  })

  log.info({ newsletterId: newsletter.id, storyCount: validIds.length }, 'acuicultura newsletter sent')
}
