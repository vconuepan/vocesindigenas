import { createCanvas, loadImage } from '@napi-rs/canvas'
import { uploadImageToR2 } from './imageStorage.js'
import { createLogger } from './logger.js'

const log = createLogger('carousel-gen')

// Paleta de colores Impacto Indígena
const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  blue: '#2563EB',
  green: '#16A34A',
  orange: '#F97316',
  red: '#DC2626',
  yellow: '#EAB308',
  darkGray: '#222222',
  mediumGray: '#555555',
}

const LOGO_WHITE = 'https://impactoindigena.com/wp-content/uploads/2025/04/cropped-logo-impacto-indigena_letras_blancas-1-scaled-1.png'
const LOGO_BLACK = 'https://impactoindigena.com/wp-content/uploads/2025/04/1-2.png'

// Formato 4:5 vertical (1080×1350 px), renderizado en 2x para máxima nitidez
const W = 1080   // ancho display
const H = 1350   // alto display (ratio 4:5)
const SCALE = 2
const RENDER_W = W * SCALE   // 2160 px
const RENDER_H = H * SCALE   // 2700 px

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Limpia markdown y caracteres problemáticos del texto */
function cleanText(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

/** Dibuja texto con wrap automático, retorna Y final */
function drawWrappedText(
  ctx: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 10,
): number {
  const words = cleanText(text).split(' ')
  let line = ''
  let currentY = y
  let lineCount = 0

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' '
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && line !== '') {
      if (lineCount >= maxLines - 1 && i < words.length - 1) {
        let truncated = line.trim()
        while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1)
        }
        ctx.fillText(truncated + '…', x, currentY)
        return currentY + lineHeight
      }
      ctx.fillText(line.trim(), x, currentY)
      line = words[i] + ' '
      currentY += lineHeight
      lineCount++
    } else {
      line = testLine
    }
  }

  if (line.trim()) {
    ctx.fillText(line.trim(), x, currentY)
    currentY += lineHeight
  }

  return currentY
}

/** Descarga y dibuja el logo */
async function drawLogo(
  ctx: any,
  x: number,
  y: number,
  height: number,
  logoUrl: string,
): Promise<void> {
  try {
    const logo = await loadImage(logoUrl)
    const width = (logo.width / logo.height) * height
    ctx.drawImage(logo, x, y, width, height)
  } catch {
    ctx.font = `bold ${28 * SCALE}px Arial`
    ctx.fillText('IMPACTO INDÍGENA', x, y + height * 0.7)
  }
}
/** Dibuja barra de colores multicolor en la parte inferior */
function drawRainbowBar(ctx: any): void {
  const barColors = [COLORS.blue, COLORS.green, COLORS.yellow, COLORS.orange, COLORS.red]
  const barWidth = RENDER_W / barColors.length
  const barHeight = 14 * SCALE
  barColors.forEach((color, i) => {
    ctx.fillStyle = color
    ctx.fillRect(i * barWidth, RENDER_H - barHeight, barWidth, barHeight)
  })
}
/** Exporta canvas en formato JPEG a 2160×2700 (4:5 × 2x) para máxima nitidez */
function exportCanvas(sourceCanvas: any): Buffer {
  return sourceCanvas.toBuffer('image/jpeg', { quality: 92 })
}
// ---------------------------------------------------------------------------
// Slide 1: Portada — Imagen IA + Título
// ---------------------------------------------------------------------------

async function generateSlide1(title: string, aiImageUrl: string): Promise<Buffer> {
  const canvas = createCanvas(RENDER_W, RENDER_H)
  const ctx = canvas.getContext('2d')

  // Fondo negro por defecto
  ctx.fillStyle = COLORS.black
  ctx.fillRect(0, 0, RENDER_W, RENDER_H)

  // Imagen IA como fondo — crop centrado para rellenar canvas 4:5
  try {
    const bgImage = await loadImage(aiImageUrl)
    const targetRatio = RENDER_W / RENDER_H   // 0.8 para 4:5
    const srcW = Math.min(bgImage.width, bgImage.height * targetRatio)
    const srcH = srcW / targetRatio
    const srcX = (bgImage.width - srcW) / 2
    const srcY = (bgImage.height - srcH) / 2
    ctx.drawImage(bgImage, srcX, srcY, srcW, srcH, 0, 0, RENDER_W, RENDER_H)
  } catch {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, RENDER_W, RENDER_H)
  }

  // Gradient oscuro en parte inferior (comienza al 40% del alto)
  const gradient = ctx.createLinearGradient(0, RENDER_H * 0.40, 0, RENDER_H)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(0.5, 'rgba(0,0,0,0.72)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.93)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, RENDER_W, RENDER_H)

  // Logo blanco en esquina superior izquierda
  await drawLogo(ctx, 40 * SCALE, 36 * SCALE, 60 * SCALE, LOGO_WHITE)

  // Etiqueta naranja encima del título
  ctx.fillStyle = COLORS.orange
  ctx.font = `bold ${18 * SCALE}px Arial`
  ctx.textAlign = 'left'
  ctx.fillText('IMPACTO INDÍGENA', 50 * SCALE, RENDER_H * 0.65)

  // Título grande blanco
  ctx.fillStyle = COLORS.white
  ctx.font = `bold ${46 * SCALE}px Arial`
  drawWrappedText(
    ctx,
    cleanText(title),
    50 * SCALE,
    RENDER_H * 0.70,
    RENDER_W - 100 * SCALE,
    58 * SCALE,
    3,
  )

  // Número de slide
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `${20 * SCALE}px Arial`
  ctx.textAlign = 'right'
  ctx.fillText('1 / 4', RENDER_W - 50 * SCALE, RENDER_H - 30 * SCALE)

  drawRainbowBar(ctx)
  return exportCanvas(canvas)
}

// ---------------------------------------------------------------------------
// Slide 2: ¿Por qué importa?
// ---------------------------------------------------------------------------

async function generateSlide2(text: string): Promise<Buffer> {
  const canvas = createCanvas(RENDER_W, RENDER_H)
  const ctx = canvas.getContext('2d')

  // Fondo blanco
  ctx.fillStyle = COLORS.white
  ctx.fillRect(0, 0, RENDER_W, RENDER_H)

  // Header azul
  const headerH = 170 * SCALE
  ctx.fillStyle = COLORS.blue
  ctx.fillRect(0, 0, RENDER_W, headerH)

  // Logo blanco en header
  await drawLogo(ctx, 40 * SCALE, 42 * SCALE, 72 * SCALE, LOGO_WHITE)

  // Título del slide centrado
  ctx.fillStyle = COLORS.white
  ctx.font = `bold ${38 * SCALE}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('RESUMEN', RENDER_W / 2, 116 * SCALE)

  // Línea decorativa azul vertical
  ctx.fillStyle = COLORS.blue
  ctx.fillRect(70 * SCALE, headerH + 50 * SCALE, 8 * SCALE, 90 * SCALE)

  // Texto principal (más líneas gracias al alto extra del 4:5)
  ctx.fillStyle = COLORS.darkGray
  ctx.font = `${40 * SCALE}px Arial`
  ctx.textAlign = 'left'
  drawWrappedText(
    ctx,
    cleanText(text),
    100 * SCALE,
    headerH + 80 * SCALE,
    RENDER_W - 180 * SCALE,
    58 * SCALE,
    18,
  )

  // Número de slide
  ctx.fillStyle = COLORS.blue
  ctx.font = `bold ${22 * SCALE}px Arial`
  ctx.textAlign = 'right'
  ctx.fillText('2 / 4', RENDER_W - 50 * SCALE, RENDER_H - 30 * SCALE)

  drawRainbowBar(ctx)
  return exportCanvas(canvas)
}

// ---------------------------------------------------------------------------
// Slide 3: ¿Qué considerar?
// ---------------------------------------------------------------------------

async function generateSlide3(text: string): Promise<Buffer> {
  const canvas = createCanvas(RENDER_W, RENDER_H)
  const ctx = canvas.getContext('2d')

  // Fondo blanco
  ctx.fillStyle = COLORS.white
  ctx.fillRect(0, 0, RENDER_W, RENDER_H)

  // Header verde
  const headerH = 170 * SCALE
  ctx.fillStyle = COLORS.green
  ctx.fillRect(0, 0, RENDER_W, headerH)

  // Logo blanco en header
  await drawLogo(ctx, 40 * SCALE, 42 * SCALE, 72 * SCALE, LOGO_WHITE)

  // Título del slide centrado
  ctx.fillStyle = COLORS.white
  ctx.font = `bold ${38 * SCALE}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('¿POR QUÉ IMPORTA?', RENDER_W / 2, 116 * SCALE)

  // Línea decorativa verde vertical
  ctx.fillStyle = COLORS.green
  ctx.fillRect(70 * SCALE, headerH + 50 * SCALE, 8 * SCALE, 90 * SCALE)

  // Renderizar texto con formato markdown
  const FONT_TITLE = 27 * SCALE
  const FONT_BODY = 25 * SCALE
  const LINE_HEIGHT = 38 * SCALE
  const MAX_WIDTH = RENDER_W - 200 * SCALE
  const LEFT = 100 * SCALE
  const MAX_LINES = 28   // más espacio vertical en 4:5

  // Parsear ANTES de limpiar para preservar el formato markdown
  const bullets = text
    .split(/\n+/)
    .map((s: string) => s.replace(/^-\s*/, '').trim())
    .filter(Boolean)

  let currentY = headerH + 65 * SCALE
  let totalLines = 0

  for (const bullet of bullets) {
    if (totalLines >= MAX_LINES) break

    // Separar título del cuerpo: "**Título:** cuerpo"
    const titleMatch = bullet.match(/^\*\*(.+?)\*\*[:\s]*([\s\S]*)/)

    if (titleMatch) {
      const title = cleanText(titleMatch[1].trim()) + ':'
      const body = cleanText(titleMatch[2].trim())

      // Dibujar título en negrita
      ctx.font = `bold ${FONT_TITLE}px Arial`
      ctx.fillStyle = COLORS.darkGray
      ctx.textAlign = 'left'

      const titleWords = title.split(' ')
      let line = ''
      for (const word of titleWords) {
        const test = line + word + ' '
        if (ctx.measureText(test).width > MAX_WIDTH && line !== '') {
          if (totalLines >= MAX_LINES) break
          ctx.fillText(line.trim(), LEFT, currentY)
          line = word + ' '
          currentY += LINE_HEIGHT
          totalLines++
        } else {
          line = test
        }
      }
      if (line.trim() && totalLines < MAX_LINES) {
        ctx.fillText(line.trim(), LEFT, currentY)
        currentY += LINE_HEIGHT
        totalLines++
      }

      // Dibujar cuerpo en normal
      ctx.font = `${FONT_BODY}px Arial`
      ctx.fillStyle = COLORS.mediumGray
      const bodyWords = body.split(' ')
      line = ''
      for (const word of bodyWords) {
        const test = line + word + ' '
        if (ctx.measureText(test).width > MAX_WIDTH && line !== '') {
          if (totalLines >= MAX_LINES) break
          ctx.fillText(line.trim(), LEFT, currentY)
          line = word + ' '
          currentY += LINE_HEIGHT
          totalLines++
        } else {
          line = test
        }
      }
      if (line.trim() && totalLines < MAX_LINES) {
        ctx.fillText(line.trim(), LEFT, currentY)
        currentY += LINE_HEIGHT
        totalLines++
      }

      // Espacio entre bullets
      currentY += 10 * SCALE
    } else {
      // Sin formato especial — dibujar normal
      ctx.font = `${FONT_BODY}px Arial`
      ctx.fillStyle = COLORS.darkGray
      ctx.textAlign = 'left'
      const words = bullet.split(' ')
      let line = ''
      for (const word of words) {
        const test = line + word + ' '
        if (ctx.measureText(test).width > MAX_WIDTH && line !== '') {
          if (totalLines >= MAX_LINES) break
          ctx.fillText(line.trim(), LEFT, currentY)
          line = word + ' '
          currentY += LINE_HEIGHT
          totalLines++
        } else {
          line = test
        }
      }
      if (line.trim() && totalLines < MAX_LINES) {
        ctx.fillText(line.trim(), LEFT, currentY)
        currentY += LINE_HEIGHT + 10 * SCALE
        totalLines++
      }
    }
  }

  // Número de slide
  ctx.fillStyle = COLORS.green
  ctx.font = `bold ${22 * SCALE}px Arial`
  ctx.textAlign = 'right'
  ctx.fillText('3 / 4', RENDER_W - 50 * SCALE, RENDER_H - 30 * SCALE)

  drawRainbowBar(ctx)
  return exportCanvas(canvas)
}

// ---------------------------------------------------------------------------
// Slide 4: Call to action
// ---------------------------------------------------------------------------

async function generateSlide4(): Promise<Buffer> {
  const canvas = createCanvas(RENDER_W, RENDER_H)
  const ctx = canvas.getContext('2d')

  // Fondo negro
  ctx.fillStyle = COLORS.black
  ctx.fillRect(0, 0, RENDER_W, RENDER_H)

  // Contenido centrado verticalmente (offY desplaza todo hacia el centro del canvas más alto)
  const offY = 210 * SCALE   // offset desde el tope del bloque de contenido

  // Logo blanco grande centrado
  const logoH = 110 * SCALE
  const logoAspect = 3.2
  const logoW = logoH * logoAspect
  const logoX = (RENDER_W - logoW) / 2
  const logoY = offY
  await drawLogo(ctx, logoX, logoY, logoH, LOGO_WHITE)

  // Texto principal
  ctx.fillStyle = COLORS.white
  ctx.font = `bold ${42 * SCALE}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('Lee la noticia completa', RENDER_W / 2, offY + 220 * SCALE)

  // URL en amarillo
  ctx.fillStyle = COLORS.yellow
  ctx.font = `${30 * SCALE}px Arial`
  ctx.fillText('impactoindigena.news', RENDER_W / 2, offY + 270 * SCALE)

  // Separador naranja
  ctx.strokeStyle = COLORS.orange
  ctx.lineWidth = 3 * SCALE
  ctx.beginPath()
  ctx.moveTo(120 * SCALE, offY + 320 * SCALE)
  ctx.lineTo(RENDER_W - 120 * SCALE, offY + 320 * SCALE)
  ctx.stroke()

  // Tagline en gris
  ctx.fillStyle = COLORS.mediumGray
  ctx.font = `${27 * SCALE}px Arial`
  ctx.fillText('Noticias sobre pueblos indígenas', RENDER_W / 2, offY + 380 * SCALE)
  ctx.fillText('curadas con IA por Impacto Indígena', RENDER_W / 2, offY + 422 * SCALE)

  // Hashtags en naranja
  ctx.fillStyle = COLORS.orange
  ctx.font = `bold ${25 * SCALE}px Arial`
  ctx.fillText('#PueblosIndígenas  #ImpactoIndígena', RENDER_W / 2, offY + 500 * SCALE)

  // Número de slide
  ctx.fillStyle = COLORS.mediumGray
  ctx.font = `${22 * SCALE}px Arial`
  ctx.textAlign = 'right'
  ctx.fillText('4 / 4', RENDER_W - 50 * SCALE, RENDER_H - 30 * SCALE)

  drawRainbowBar(ctx)
  return exportCanvas(canvas)
}

// ---------------------------------------------------------------------------
// Main: Genera las 4 slides y las sube a R2
// ---------------------------------------------------------------------------

export interface CarouselSlide {
  imageUrl: string
  order: number
}

export async function generateCarousel(
  storyId: string,
  title: string,
  whyItMatters: string,
  considerations: string,
  storyUrl: string,
  aiImageUrl: string,
): Promise<CarouselSlide[]> {
  log.info({ storyId }, 'generating Instagram carousel')

  const timestamp = Date.now()

  const [slide1, slide2, slide3, slide4] = await Promise.all([
    generateSlide1(title, aiImageUrl),
    generateSlide2(whyItMatters),
    generateSlide3(considerations),
    generateSlide4(),
  ])

  const slides = [
    { buffer: slide1, order: 1 },
    { buffer: slide2, order: 2 },
    { buffer: slide3, order: 3 },
    { buffer: slide4, order: 4 },
  ]

  const uploaded: CarouselSlide[] = []

  for (const slide of slides) {
    const filename = `${storyId}-slide${slide.order}-${timestamp}.png`
    const url = await uploadImageToR2(slide.buffer, filename.replace('.png', '.jpg'), 'image/jpeg')
    uploaded.push({ imageUrl: url, order: slide.order })
    log.info({ storyId, order: slide.order, url }, 'slide uploaded')
  }

  log.info({ storyId, slideCount: uploaded.length }, 'carousel generated')
  return uploaded
}
