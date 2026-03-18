import { createLogger } from '../lib/logger.js'
import prisma from '../lib/prisma.js'
import { getLLMByTier, rateLimitDelay } from '../services/llm.js'
import { HumanMessage } from '@langchain/core/messages'
import { generateHtmlContent } from '../services/newsletter.js'
import * as plunk from '../services/plunk.js'

const log = createLogger('send_chile_indigena_newsletter')

const CHILE_EMAIL = process.env.CHILE_INDIGENA_NEWSLETTER_EMAIL || 'venancio@conuepan.cl'

const LOOKBACK_DAYS = 7

export async function runSendChileIndigenaNewsletter(): Promise<void> {
  log.info('starting chile indigena newsletter job')

  const today = new Date()
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)

  const existing = await prisma.newsletter.findFirst({
    where: {
      title: { contains: '[CHILE INDÍGENA]' },
      createdAt: { gte: startOfDay },
      status: 'published',
    },
  })
  if (existing) {
    log.info('chile indigena newsletter already sent today, skipping')
    return
  }

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
    log.info('no stories found for chile indigena newsletter')
    return
  }

  const llm = getLLMByTier('large')
  const storiesJson = stories.map(s => ({
    id: s.id,
    title: s.title || s.sourceTitle,
    summary: s.summary,
    relevanceReasons: s.relevanceReasons,
    issue: s.issue?.name || s.feed?.title || 'General',
    relevance: s.relevance,
  }))

  const selectionPrompt = `Eres un experto en política indígena de Chile con profundo conocimiento de los pueblos originarios chilenos, la institucionalidad del Estado y los conflictos socioambientales.

Tu tarea es seleccionar ÚNICAMENTE las noticias que tengan relación directa con la política indígena en Chile, incluyendo cualquiera de estos temas:

INSTITUCIONALIDAD Y POLÍTICA PÚBLICA:
- Actividad, decisiones o declaraciones de CONADI (Corporación Nacional de Desarrollo Indígena)
- Actividad de la UCAI (Unidad de Coordinación de Asuntos Indígenas) u otras reparticiones del Gobierno de Chile
- Declaraciones de autoridades del Gobierno de Chile sobre pueblos indígenas (Presidente, ministros, subsecretarios)
- Declaraciones o mociones de parlamentarios chilenos (senadores y diputados) sobre pueblos indígenas
- Políticas públicas, programas o presupuestos del Estado chileno relacionados con pueblos indígenas

CONSULTA Y PARTICIPACIÓN:
- Procesos de consulta indígena en Chile (Convenio 169 OIT aplicado en Chile)
- Estudios de Impacto Ambiental (EIA) o Declaraciones de Impacto Ambiental (DIA) con componente indígena
- Resoluciones del Servicio de Evaluación Ambiental (SEA) o del Tribunal Ambiental sobre proyectos en territorios indígenas

CONFLICTOS Y DIÁLOGOS:
- Conflicto mapuche: enfrentamientos, tomas de terreno, incendios, ataques, detenciones, juicios
- Conflictos socioambientales en territorios indígenas chilenos (minería, forestales, energía, agua, etc.)
- Diálogos, mesas de trabajo, acuerdos o negociaciones entre el Estado y comunidades indígenas
- Violencia política en La Araucanía, Biobío, Los Ríos u otras zonas con presencia indígena

JUSTICIA:
- Sentencias judiciales o resoluciones de tribunales chilenos sobre derechos indígenas
- Fallos del Tribunal Ambiental, Corte Suprema, Corte de Apelaciones en casos con comunidades indígenas
- Causas penales, absoluciones o condenas de imputados mapuche u otros indígenas
- Recursos de protección o amparo presentados por o contra comunidades indígenas

PUEBLOS INDÍGENAS DE CHILE:
- Pueblo Mapuche (incluyendo mapuche lafkenche, pewenche, williche, huilliche, nagche, warriache/urbano)
- Pueblo Aymara
- Pueblo Lican Antai (Atacameño)
- Pueblo Rapa Nui
- Pueblo Kawésqar
- Pueblo Diaguita
- Pueblo Quechua, Colla, Chango, Yagán, Ona
- Indígenas urbanos en Santiago y otras ciudades
- Organizaciones indígenas chilenas y sus demandas

INSTRUCCIONES:
- Incluye SOLO noticias que ocurran en Chile o que involucren directamente a pueblos indígenas de Chile
- Excluye noticias de pueblos indígenas de otros países sin conexión chilena
- Selecciona entre 5 y 10 noticias — prioriza diversidad temática (no solo conflicto mapuche)
- Si hay pocas noticias relevantes, selecciona menos; no fuerces la cantidad

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
    log.info({ reasoning: parsed.reasoning, count: selectedIds.length }, 'LLM chile indigena selection')
  } catch {
    log.warn('failed to parse LLM response, falling back to top stories')
    selectedIds = stories.slice(0, 8).map(s => s.id)
  }

  const validIds = selectedIds.filter(id => stories.find(s => s.id === id))
  if (validIds.length === 0) {
    log.info('no chile-indigena-relevant stories found this period, skipping send')
    return
  }

  // Agrupar por subtema usando LLM
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

  const groupPrompt = `Clasifica cada noticia sobre política indígena en Chile según estas categorías temáticas. Usa solo las categorías que tengan al menos una noticia:

- Política Pública y CONADI
- Consulta Indígena y Evaluación Ambiental
- Conflicto Mapuche y Socioambiental
- Diálogos y Acuerdos
- Justicia y Tribunales
- Declaraciones Gobierno y Parlamento
- Pueblos Indígenas y Organizaciones
- Otros

Noticias:
${selectedStories.map(s => `- ID: ${s.id} | Título: ${s.title || s.sourceTitle} | Resumen: ${s.summary}`).join('\n')}

Responde SOLO con JSON sin texto adicional:
{"groups": {"Política Pública y CONADI": ["id1"], "Conflicto Mapuche y Socioambiental": ["id2","id3"], ...}}`

  await rateLimitDelay()
  const groupResponse = await llm.invoke([new HumanMessage(groupPrompt)])
  let groups: Record<string, string[]> = {}
  try {
    const clean = (groupResponse.content as string).replace(/```json|```/g, '').trim()
    groups = JSON.parse(clean).groups || {}
  } catch {
    groups = { 'Política Indígena Chile': validIds }
  }

  // Construir contenido markdown
  const dateLabel = today.toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const title = `[CHILE INDÍGENA] Radar Política Indígena — ${dateLabel}`

  let content = `**Radar Política Indígena Chile — ${dateLabel}**\n\n`
  content += `Selección de noticias sobre consulta indígena, conflictos socioambientales, CONADI, justicia, declaraciones de gobierno y parlamento, y pueblos indígenas de Chile — últimos ${LOOKBACK_DAYS} días.\n\n---\n\n`

  const storyMap = new Map(selectedStories.map(s => [s.id, s]))
  for (const [groupName, ids] of Object.entries(groups)) {
    if (!ids || ids.length === 0) continue
    content += `# ${groupName}\n\n`
    for (const id of ids) {
      const story = storyMap.get(id)
      if (!story) continue
      const publisher = story.feed?.displayTitle || story.feed?.title || 'Fuente'
      const analysisUrl = story.slug ? `https://impactoindigena.news/stories/${story.slug}` : null

      content += `## ${story.title || story.sourceTitle}\n`
      content += `${publisher} · [artículo original](${story.sourceUrl})`
      if (analysisUrl) content += ` · [análisis](${analysisUrl})`
      content += `\n\n`

      const body = story.relevanceSummary || story.marketingBlurb || story.summary || ''
      if (body) content += `${body}\n\n`
      if (story.quote && story.quoteAttribution) {
        content += `> "${story.quote}"\n> — ${story.quoteAttribution}\n\n`
      }
    }
    content += `---\n\n`
  }

  const newsletter = await prisma.newsletter.create({
    data: { title, storyIds: validIds, selectedStoryIds: validIds },
  })

  await prisma.newsletter.update({
    where: { id: newsletter.id },
    data: { content: content.trim(), selectedStoryIds: validIds },
  })

  await generateHtmlContent(newsletter.id)

  const updated = await prisma.newsletter.findUnique({ where: { id: newsletter.id } })
  if (!updated?.html) throw new Error('No HTML generated for chile indigena newsletter')

  await plunk.sendTransactional({
    to: CHILE_EMAIL,
    subject: title,
    body: updated.html,
  })

  await prisma.newsletter.update({
    where: { id: newsletter.id },
    data: { status: 'published' },
  })

  log.info({ newsletterId: newsletter.id, storyCount: validIds.length }, 'chile indigena newsletter sent')
}
