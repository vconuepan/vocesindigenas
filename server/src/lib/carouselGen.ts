import { createCanvas, loadImage } from 'canvas'
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

// Renderizamos en 2x para máxima nitidez
const SIZE = 1080
const SCALE = 2
const RENDER_SIZE = SIZE * SCALE

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
  const barWidth = RENDER_SIZE / barColors.length
  const barHeight = 14 * SCALE
  barColors.forEach((color, i) => {
    ctx.fillStyle = color
    ctx.fillRect(i * barWidth, RENDER_SIZE - barHeight, barWidth, barHeight)
  })
}

/** Exporta canvas renderizado 2x a Buffer PNG en tamaño final 1080x1080 */
function exportCanvas(sourceCanvas: any): Buffer {
  const outCanvas = createCanvas(SIZE, SIZE)
  const outCtx = outCanvas.getContext('2d')
  outCtx.drawImage(sourceCanvas, 0, 0, SIZE, SIZE)
  return outCanvas.toBuffer('image/png', { compressionLevel: 1 })
}

// ---------------------------------------------------------------------------
// Slide 1: Portada — Imagen IA + Título
// ---------------------------------------------------------------------------

async function generateSlide1(title: string, aiImageUrl: string): Promise<Buffer> {
  const canvas = createCanvas(RENDER_SIZE, RENDER_SIZE)
  const ctx = canvas.getContext('2d')

  // Fondo negro por defecto
  ctx.fillStyle = COLORS.black
  ctx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE)

  // Imagen IA como fondo cuadrado
  try {
    const bgImage = await loadImage(aiImageUrl)
    const srcSize = Math.min(bgImage.width, bgImage.height)
    const srcX = (bgImage.width - srcSize) / 2
    const srcY = (bgImage.height - srcSize) / 2
    ctx.drawImage(bgImage, srcX, srcY, srcSize, srcSize, 0, 0, RENDER_SIZE, RENDER_SIZE)
  } catch {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE)
  }

  // Gradient oscuro en parte inferior
  const gradient = ctx.createLinearGradient(0, RENDER_SIZE * 0.35, 0, RENDER_SIZE)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(0.5, 'rgba(0,0,0,0.72)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.93)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE)

  // Logo blanco en esquina superior izquierda (sin recuadro)
  await drawLogo(ctx, 40 * SCALE, 36 * SCALE, 60 * SCALE, LOGO_WHITE)

  // Etiqueta naranja encima del título
  ctx.fillStyle = COLORS.orange
  ctx.font = `bold ${18 * SCALE}px Arial`
  ctx.textAlign = 'left'
  ctx.fillText('IMPACTO INDÍGENA', 50 * SCALE, RENDER_SIZE * 0.62)

  // Título grande blanco
  ctx.fillStyle = COLORS.white
  ctx.font = `bold ${46 * SCALE}px Arial`
  drawWrappedText(
    ctx,
    cleanText(title),
    50 * SCALE,
    RENDER_SIZE * 0.67,
    RENDER_SIZE - 100 * SCALE,
    58 * SCALE,
    3,
  )

  // Número de slide
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `${20 * SCALE}px Arial`
  ctx.textAlign = 'right'
  ctx.fillText('1 / 4', RENDER_SIZE - 50 * SCALE, RENDER_SIZE - 30 * SCALE)

  drawRainbowBar(ctx)
  return exportCanvas(canvas)
}

// ---------------------------------------------------------------------------
// Slide 2: ¿Por qué importa?
// ---------------------------------------------------------------------------

async function generateSlide2(text: string): Promise<Buffer> {
  const canvas = createCanvas(RENDER_SIZE, RENDER_SIZE)
  const ctx = canvas.getContext('2d')

  // Fondo blanco
  ctx.fillStyle = COLORS.white
  ctx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE)

  // Header azul
  const headerH = 170 * SCALE
  ctx.fillStyle = COLORS.blue
  ctx.fillRect(0, 0, RENDER_SIZE, headerH)

  // Logo blanco en header
  await drawLogo(ctx, 40 * SCALE, 42 * SCALE, 72 * SCALE, LOGO_WHITE)

  // Título del slide centrado
  ctx.fillStyle = COLORS.white
  ctx.font = `bold ${38 * SCALE}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('¿POR QUÉ IMPORTA?', RENDER_SIZE / 2, 116 * SCALE)

  // Línea decorativa azul vertical
  ctx.fillStyle = COLORS.blue
  ctx.fillRect(70 * SCALE, headerH + 50 * SCALE, 8 * SCALE, 90 * SCALE)

  // Texto principal
  ctx.fillStyle = COLORS.darkGray
  ctx.font = `${33 * SCALE}px Arial`
  ctx.textAlign = 'left'
  drawWrappedText(
    ctx,
    cleanText(text),
    100 * SCALE,
    headerH + 65 * SCALE,
    RENDER_SIZE - 160 * SCALE,
    50 * SCALE,
    9,
  )

  // Número de slide
  ctx.fillStyle = COLORS.blue
  ctx.font = `bold ${22 * SCALE}px Arial`
  ctx.textAlign = 'right'
  ctx.fillText('2 / 4', RENDER_SIZE - 50 * SCALE, RENDER_SIZE - 30 * SCALE)

  drawRainbowBar(ctx)
  return exportCanvas(canvas)
}

// ---------------------------------------------------------------------------
// Slide 3: ¿Qué considerar?
// ---------------------------------------------------------------------------

async function generateSlide3(text: string): Promise<Buffer> {
  const canvas = createCanvas(RENDER_SIZE, RENDER_SIZE)
  const ctx = canvas.getContext('2d')

  // Fondo blanco
  ctx.fillStyle = COLORS.white
  ctx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE)

  // Header verde
  const headerH = 170 * SCALE
  ctx.fillStyle = COLORS.green
  ctx.fillRect(0, 0, RENDER_SIZE, headerH)

  // Logo blanco en header
  await drawLogo(ctx, 40 * SCALE, 42 * SCALE, 72 * SCALE, LOGO_WHITE)

  // Título del slide centrado
  ctx.fillStyle = COLORS.white
  ctx.font = `bold ${38 * SCALE}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('¿QUÉ CONSIDERAR?', RENDER_SIZE / 2, 116 * SCALE)

  // Línea decorativa verde vertical
  ctx.fillStyle = COLORS.green
  ctx.fillRect(70 * SCALE, headerH + 50 * SCALE, 8 * SCALE, 90 * SCALE)

  // Texto principal
  ctx.fillStyle = COLORS.darkGray
  ctx.font = `${33 * SCALE}px Arial`
  ctx.textAlign = 'left'
  drawWrappedText(
    ctx,
    cleanText(text),
    100 * SCALE,
    headerH + 65 * SCALE,
    RENDER_SIZE - 160 * SCALE,
    50 * SCALE,
    9,
  )

  // Número de slide
  ctx.fillStyle = COLORS.green
  ctx.font = `bold ${22 * SCALE}px Arial`
  ctx.textAlign = 'right'
  ctx.fillText('3 / 4', RENDER_SIZE - 50 * SCALE, RENDER_SIZE - 30 * SCALE)

  drawRainbowBar(ctx)
  return exportCanvas(canvas)
}

// ---------------------------------------------------------------------------
// Slide 4: Call to action
// ---------------------------------------------------------------------------

async function generateSlide4(): Promise<Buffer> {
  const canvas = createCanvas(RENDER_SIZE, RENDER_SIZE)
  const ctx = canvas.getContext('2d')

  // Fondo negro
  ctx.fillStyle = COLORS.black
  ctx.fillRect(0, 0, RENDER_SIZE, RENDER_SIZE)

  // Logo blanco grande centrado
  const logoH = 110 * SCALE
  const logoAspect = 3.2
  const logoW = logoH * logoAspect
  const logoX = (RENDER_SIZE - logoW) / 2
  const logoY = 210 * SCALE
  await drawLogo(ctx, logoX, logoY, logoH, LOGO_WHITE)

  // Texto principal
  ctx.fillStyle = COLORS.white
  ctx.font = `bold ${42 * SCALE}px Arial`
  ctx.textAlign = 'center'
  ctx.fillText('Lee la noticia completa', RENDER_SIZE / 2, 430 * SCALE)

  // URL en amarillo
  ctx.fillStyle = COLORS.yellow
  ctx.font = `${30 * SCALE}px Arial`
  ctx.fillText('impactoindigena.news', RENDER_SIZE / 2, 480 * SCALE)

  // Separador naranja
  ctx.strokeStyle = COLORS.orange
  ctx.lineWidth = 3 * SCALE
  ctx.beginPath()
  ctx.moveTo(120 * SCALE, 530 * SCALE)
  ctx.lineTo(RENDER_SIZE - 120 * SCALE, 530 * SCALE)
  ctx.stroke()

  // Tagline en gris
  ctx.fillStyle = COLORS.mediumGray
  ctx.font = `${27 * SCALE}px Arial`
  ctx.fillText('Noticias sobre pueblos indígenas', RENDER_SIZE / 2, 590 * SCALE)
  ctx.fillText('curadas con IA por Impacto Indígena', RENDER_SIZE / 2, 632 * SCALE)

  // Hashtags en naranja
  ctx.fillStyle = COLORS.orange
  ctx.font = `bold ${25 * SCALE}px Arial`
  ctx.fillText('#PueblosIndígenas  #ImpactoIndígena', RENDER_SIZE / 2, 710 * SCALE)

  // Número de slide
  ctx.fillStyle = COLORS.mediumGray
  ctx.font = `${22 * SCALE}px Arial`
  ctx.fillText('4 / 4', RENDER_SIZE - 50 * SCALE, RENDER_SIZE - 30 * SCALE)

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
    const url = await uploadImageToR2(slide.buffer, filename)
    uploaded.push({ imageUrl: url, order: slide.order })
    log.info({ storyId, order: slide.order, url }, 'slide uploaded')
  }

  log.info({ storyId, slideCount: uploaded.length }, 'carousel generated')
  return uploaded
}
