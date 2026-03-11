import { createLogger } from '../lib/logger.js'
import prisma from '../lib/prisma.js'
import { getLLMByTier, rateLimitDelay } from '../services/llm.js'
import { HumanMessage } from '@langchain/core/messages'
import { generateHtmlContent } from '../services/newsletter.js'
import * as plunk from '../services/plunk.js'

const log = createLogger('send_private_newsletter')

const PRIVATE_EMAIL = process.env.PRIVATE_NEWSLETTER_EMAIL || 'venancio@conuepan.cl'

const PRIVATE_INTERESTS = `
1. Debida diligencia indígena en Latinoamérica
2. Minería y pueblos indígenas en las Américas, Australia y Nueva Zelanda
3. Industria acuícola y pueblos indígenas a nivel global
4. Industria energética y pueblos indígenas a nivel global
5. Consentimiento Libre, Previo e Informado (CLPI)
6. Empresas indígenas de Australia, Canadá, Nueva Zelanda, Estados Unidos y Latinoamérica
7. Política indígena de Chile, especialmente pueblo Mapuche, Likanantai y política pública del Gobierno
`

export async function runSendPrivateNewsletter(): Promise<void> {
  log.info('starting private newsletter job')

  // Verificar que no se haya enviado uno hoy
  const today = new Date()
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)

  const existing = await prisma.newsletter.findFirst({
    where: {
      title: { contains: '[PRIVADO]' },
      createdAt: { gte: startOfDay },
      status: 'published',
    },
  })
  if (existing) {
    log.info('private newsletter already sent today, skipping')
    return
  }

  // Buscar las historias publicadas en los últimos 2 días con mayor relevancia
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const stories = await prisma.story.findMany({
    where: {
      status: 'published',
      datePublished: { gte: since },
      relevance: { gte: 6 },
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
      antifactors: true,
      marketingBlurb: true,
      quote: true,
      quoteAttribution: true,
      emotionTag: true,
      relevance: true,
      issue: { select: { name: true, slug: true } },
      feed: { select: { title: true, displayTitle: true } },
    },
    orderBy: { relevance: 'desc' },
    take: 50,
  })

  if (stories.length === 0) {
    log.info('no high-relevance stories found for private newsletter')
    return
  }

  // Usar LLM para seleccionar y priorizar según intereses personales
  const llm = getLLMByTier('large')
  const storiesJson = stories.map(s => ({
    id: s.id,
    title: s.title || s.sourceTitle,
    summary: s.summary,
    issue: s.issue?.name || s.feed?.title || 'General',
    relevance: s.relevance,
  }))

  const selectionPrompt = `Eres un asistente experto en asuntos indígenas. Selecciona las 12 noticias más relevantes para alguien con estos intereses profesionales:

${PRIVATE_INTERESTS}

Noticias disponibles (en JSON):
${JSON.stringify(storiesJson, null, 2)}

Responde SOLO con un JSON con este formato exacto, sin texto adicional:
{"selectedIds": ["id1", "id2", ...], "reasoning": "explicación breve"}`

  await rateLimitDelay()
  const response = await llm.invoke([new HumanMessage(selectionPrompt)])
  const responseText = response.content as string

  let selectedIds: string[] = []
  try {
    const clean = responseText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    selectedIds = parsed.selectedIds || []
    log.info({ reasoning: parsed.reasoning }, 'LLM selection reasoning')
  } catch {
    log.warn('failed to parse LLM response, using top stories by relevance')
    selectedIds = stories.slice(0, 12).map(s => s.id)
  }

  // Filtrar solo IDs válidos
  const validIds = selectedIds.filter(id => stories.find(s => s.id === id))
  if (validIds.length === 0) {
    validIds.push(...stories.slice(0, 12).map(s => s.id))
  }

  // Crear newsletter privado
  const title = `[PRIVADO] Impacto Indígena — ${today.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
  const newsletter = await prisma.newsletter.create({
    data: {
      title,
      storyIds: validIds,
      selectedStoryIds: validIds,
    },
  })

  // Generar contenido y HTML
  const { generateContent } = await import('../services/newsletter.js')
  await generateContent(newsletter.id)
  await generateHtmlContent(newsletter.id)

  // Obtener el HTML generado
  const updated = await prisma.newsletter.findUnique({ where: { id: newsletter.id } })
  if (!updated?.html) throw new Error('No HTML generated')

  // Enviar directo al email privado
  await plunk.sendTransactional({
    to: PRIVATE_EMAIL,
    subject: title,
    body: updated.html,
  })

  // Marcar como publicado
  await prisma.newsletter.update({
    where: { id: newsletter.id },
    data: { status: 'published' },
  })

  log.info({ newsletterId: newsletter.id, storyCount: validIds.length }, 'private newsletter ready')
  log.info('private newsletter job complete')
}
