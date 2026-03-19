import { createLogger } from '../lib/logger.js'
import prisma from '../lib/prisma.js'
import { getLLMByTier, rateLimitDelay } from '../services/llm.js'
import { HumanMessage } from '@langchain/core/messages'
import { uploadImageToR2 } from '../lib/imageStorage.js'
import OpenAI from 'openai'
import { config } from '../config.js'

const log = createLogger('generate_chile_indigena_podcast')

const INTRO = `Bienvenidos a Impacto Indígena Chile. Las noticias más importantes sobre los pueblos originarios de Chile de hoy.`
const OUTRO = `Eso es todo por hoy. Más información en impactoindigena.news.`

export async function runGenerateChileIndigenaPodcast(): Promise<void> {
  log.info('starting chile indigena daily podcast job')

  // Evitar duplicados del día
  const today = new Date()
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)

  const existing = await prisma.podcast.findFirst({
    where: {
      title: { contains: '[CHILE INDÍGENA]' },
      createdAt: { gte: startOfDay },
      status: 'published',
    },
  })
  if (existing) {
    log.info('chile indigena podcast already generated today, skipping')
    return
  }

  // Buscar noticias del día de la categoría chile-indigena
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const issue = await prisma.issue.findUnique({ where: { slug: 'chile-indigena' } })

  const stories = await prisma.story.findMany({
    where: {
      status: 'published',
      datePublished: { gte: since },
      issueId: issue?.id,
      summary: { not: null },
      relevanceReasons: { not: null },
    },
    orderBy: [{ relevance: 'desc' }, { datePublished: 'desc' }],
    take: 5,
    select: { id: true, title: true, sourceTitle: true, summary: true, relevanceReasons: true },
  })

  if (stories.length === 0) {
    log.info('no chile-indigena stories found today, skipping podcast')
    return
  }

  // Generar guión corto (2-3 minutos = 300-450 palabras)
  const llm = getLLMByTier('large')
  const storiesText = stories
    .map((s, i) => `Noticia ${i + 1}: ${s.title || s.sourceTitle}\n${s.summary}`)
    .join('\n\n')

  const scriptPrompt = `Eres el presentador del podcast diario "Impacto Indígena Chile". Crea un resumen noticioso breve y natural en español con estas noticias sobre pueblos indígenas de Chile.

REGLAS ESTRICTAS:
- Máximo 400 palabras en total (2-3 minutos de audio)
- Tono periodístico, directo y claro
- Transiciones naturales entre noticias
- NO incluyas intro ni outro
- Si hay pocas noticias, profundiza en cada una; no rellenes

Noticias de hoy:
${storiesText}

Responde SOLO en JSON sin markdown:
{
  "title": "título del episodio (máximo 60 caracteres)",
  "script": "el script completo"
}`

  await rateLimitDelay()
  const response = await llm.invoke([new HumanMessage(scriptPrompt)])
  const responseText = response.content as string

  let title = `[CHILE INDÍGENA] ${today.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}`
  let script = storiesText

  try {
    const clean = responseText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (parsed.title) title = `[CHILE INDÍGENA] ${parsed.title}`
    if (parsed.script) script = parsed.script
  } catch {
    log.warn('failed to parse LLM script response, using raw summaries')
  }

  // Generar audio
  const openai = new OpenAI()
  const fullScript = `${INTRO}\n\n${script}\n\n${OUTRO}`
  log.info({ words: fullScript.split(' ').length }, 'generating TTS audio')

  const MAX_CHARS = 4000
  const parts: string[] = []
  if (fullScript.length <= MAX_CHARS) {
    parts.push(fullScript)
  } else {
    const paragraphs = fullScript.split('\n\n')
    let current = ''
    for (const para of paragraphs) {
      if ((current + para).length > MAX_CHARS) {
        if (current) parts.push(current.trim())
        current = para + '\n\n'
      } else {
        current += para + '\n\n'
      }
    }
    if (current.trim()) parts.push(current.trim())
  }

  const audioBuffers: Buffer[] = []
  for (const part of parts) {
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: (config.podcast?.voice || 'nova') as 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer',
      input: part,
      response_format: 'mp3',
      speed: 1.0,
    })
    const arrayBuffer = await ttsResponse.arrayBuffer()
    audioBuffers.push(Buffer.from(arrayBuffer))
  }
  const audioBuffer = Buffer.concat(audioBuffers)

  // Subir a R2
  const episodeCount = await prisma.podcast.count()
  const episodeNumber = episodeCount + 1
  const filename = `podcast-chile-${episodeNumber}-${Date.now()}.mp3`
  const audioUrl = await uploadImageToR2(audioBuffer, filename, 'audio/mpeg')

  const wordCount = script.split(' ').length
  const duration = Math.round((wordCount / 150) * 60)

  // Guardar en DB
  await prisma.podcast.create({
    data: {
      title,
      description: `Noticias indígenas de Chile — ${today.toLocaleDateString('es-CL')}`,
      script,
      audioUrl,
      duration,
      episodeNumber,
      storyIds: stories.map(s => s.id),
      status: 'published',
      publishedAt: new Date(),
    },
  })

  log.info({ title, duration, storyCount: stories.length, audioUrl }, 'chile indigena podcast generated')
}
