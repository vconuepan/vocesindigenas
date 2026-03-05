import { createCanvas, loadImage, registerFont } from 'canvas'
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
  lightGray: '#F5F5F5',
  darkGray: '#333333',
  mediumGray: '#666666',
}

const SLIDE_SIZE = 1080
const LOGO_URL = 'https://impactoindigena.news/images/logo-horizontal.png'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapText(
  ctx: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (const word of words) {
    const testLine = line + word + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, currentY)
      line = word + ' '
      currentY += lineHeight
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

async function drawLogo(ctx: any, canvas: any): Promise<void> {
  try {
    const logo = await loadImage(LOGO_URL)
    const logoHeight = 60
    const logoWidth = (logo.width / logo.height) * logoHeight
    ctx.drawImage(logo, 40, 40, logoWidth, logoHeight)
  } catch (err) {
    // Si falla el logo, escribir texto
    ctx.fillStyle = COLORS.black
    ctx.font = 'bold 24px Arial'
    ctx.fillText('IMPACTO INDÍGENA', 40, 80)
  }
}

function drawAccentBar(ctx: any, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(0, SLIDE_SIZE - 12, SLIDE_SIZE, 12)
}

function drawSlideNumber(ctx: any, current: number, total: number): void {
  ctx.fillStyle = COLORS.mediumGray
  ctx.font = '20px Arial'
  ctx.textAlign = 'right'
  ctx.fillText(`${current}/${total}`, SLIDE_SIZE - 40, SLIDE_SIZE - 30)
  ctx.textAlign = 'left'
}

// ---------------------------------------------------------------------------
// Slide 1: Portada — Imagen IA + Título
// ---------------------------------------------------------------------------

async function generateSlide1(
  title: string,
  aiImageUrl: string,
): Promise<Buffer> {
  const canvas = createCanvas(SLIDE_SIZE, SLIDE_SIZE)
  const ctx = canvas.getContext('2d')

  // Fondo: imagen IA
  try {
    const bgImage = await loadImage(aiImageUrl)
    ctx.drawImage(bgImage, 0, 0, SLIDE_SIZE, SLIDE_SIZE)
  } catch {
    ctx.fillStyle = COLORS.black
    ctx.fillRect(0, 0, SLIDE_SIZE, SLIDE_SIZE)
  }

  // Overlay oscuro en parte inferior para legibilidad
  const gradient = ctx.createLinearGradient(0, SLIDE_SIZE * 0.4, 0, SLIDE_SIZE)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.85)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, SLIDE_SIZE, SLIDE_SIZE)

  // Logo en esquina superior izquierda (sobre fondo semi-transparente)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  ctx.roundRect(30, 30, 280, 75, 8)
  ctx.fill()
  await drawLogo(ctx, canvas)

  // Título
  ctx.fillStyle = COLORS.white
  ctx.font = 'bold 52px Arial'
  ctx.textAlign = 'left'
  wrapText(ctx, title, 50, SLIDE_SIZE * 0.6, SLIDE_SIZE - 100, 65)

  // Barra de color inferior
  drawAccentBar(ctx, COLORS.orange)
  drawSlideNumber(ctx, 1, 4)

  return canvas.toBuffer('image/png')
}

// ---------------------------------------------------------------------------
// Slide 2: ¿Por qué importa?
// ---------------------------------------------------------------------------

async function generateSlide2(whyItMatters: string): Promise<Buffer> {
  const canvas = createCanvas(SLIDE_SIZE, SLIDE_SIZE)
  const ctx = canvas.getContext('2d')

  // Fondo blanco
  ctx.fillStyle = COLORS.white
  ctx.fillRect(0, 0, SLIDE_SIZE, SLIDE_SIZE)

  // Franja de color superior
  ctx.fillStyle = COLORS.blue
  ctx.fillRect(0, 0, SLIDE_SIZE, 130)

  // Logo en franja azul
  try {
    const logo = await loadImage(LOGO_URL)
    const logoHeight = 55
    const logoWidth = (logo.width / logo.height) * logoHeight
    // Dibujar logo con tinte blanco sobre fondo azul
    ctx.drawImage(logo, 40, 37, logoWidth, logoHeight)
  } catch {
    ctx.fillStyle = COLORS.white
    ctx.font = 'bold 22px Arial'
    ctx.fillText('IMPACTO INDÍGENA', 40, 80)
  }

  // Título de slide
  ctx.fillStyle = COLORS.white
  ctx.font = 'bold 38px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('¿POR QUÉ IMPORTA?', SLIDE_SIZE / 2, 88)
  ctx.textAlign = 'left'

  // Icono decorativo
  ctx.fillStyle = COLORS.blue
  ctx.font = '80px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('🌍', SLIDE_SIZE / 2, 260)
  ctx.textAlign = 'left'

  // Texto principal
  ctx.fillStyle = COLORS.darkGray
  ctx.font = '34px Arial'
  ctx.textAlign = 'center'
  
  // Dividir texto en palabras y centrar
  const words = whyItMatters.split(' ')
  let line = ''
  let y = 320
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > 900 && line !== '') {
      ctx.fillText(line.trim(), SLIDE_SIZE / 2, y)
      line = word + ' '
      y += 50
    } else {
      line = test
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), SLIDE_SIZE / 2, y)
  ctx.textAlign = 'left'

  drawAccentBar(ctx, COLORS.blue)
  drawSlideNumber(ctx, 2, 4)

  return canvas.toBuffer('image/png')
}

// ---------------------------------------------------------------------------
// Slide 3: ¿Qué considerar?
// ---------------------------------------------------------------------------

async function generateSlide3(considerations: string): Promise<Buffer> {
  const canvas = createCanvas(SLIDE_SIZE, SLIDE_SIZE)
  const ctx = canvas.getContext('2d')

  // Fondo blanco
  ctx.fillStyle = COLORS.white
  ctx.fillRect(0, 0, SLIDE_SIZE, SLIDE_SIZE)

  // Franja de color superior
  ctx.fillStyle = COLORS.green
  ctx.fillRect(0, 0, SLIDE_SIZE, 130)

  // Logo
  try {
    const logo = await loadImage(LOGO_URL)
    const logoHeight = 55
    const logoWidth = (logo.width / logo.height) * logoHeight
    ctx.drawImage(logo, 40, 37, logoWidth, logoHeight)
  } catch {
    ctx.fillStyle = COLORS.white
    ctx.font = 'bold 22px Arial'
    ctx.fillText('IMPACTO INDÍGENA', 40, 80)
  }

  // Título de slide
  ctx.fillStyle = COLORS.white
  ctx.font = 'bold 38px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('¿QUÉ CONSIDERAR?', SLIDE_SIZE / 2, 88)
  ctx.textAlign = 'left'

  // Icono decorativo
  ctx.fillStyle = COLORS.green
  ctx.font = '80px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('🔍', SLIDE_SIZE / 2, 260)
  ctx.textAlign = 'left'

  // Texto principal
  ctx.fillStyle = COLORS.darkGray
  ctx.font = '34px Arial'
  ctx.textAlign = 'center'

  const words = considerations.split(' ')
  let line = ''
  let y = 320
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > 900 && line !== '') {
      ctx.fillText(line.trim(), SLIDE_SIZE / 2, y)
      line = word + ' '
      y += 50
    } else {
      line = test
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), SLIDE_SIZE / 2, y)
  ctx.textAlign = 'left'

  drawAccentBar(ctx, COLORS.green)
  drawSlideNumber(ctx, 3, 4)

  return canvas.toBuffer('image/png')
}

// ---------------------------------------------------------------------------
// Slide 4: Call to action
// ---------------------------------------------------------------------------

async function generateSlide4(storyUrl: string): Promise<Buffer> {
  const canvas = createCanvas(SLIDE_SIZE, SLIDE_SIZE)
  const ctx = canvas.getContext('2d')

  // Fondo negro
  ctx.fillStyle = COLORS.black
  ctx.fillRect(0, 0, SLIDE_SIZE, SLIDE_SIZE)

  // Logo grande centrado
  try {
    const logo = await loadImage(LOGO_URL)
    const logoHeight = 120
    const logoWidth = (logo.width / logo.height) * logoHeight
    // Fondo blanco detrás del logo
    ctx.fillStyle = COLORS.white
    ctx.beginPath()
    ctx.roundRect(
      SLIDE_SIZE / 2 - logoWidth / 2 - 20,
      220,
      logoWidth + 40,
      logoHeight + 20,
      12,
    )
    ctx.fill()
    ctx.drawImage(logo, SLIDE_SIZE / 2 - logoWidth / 2, 230, logoWidth, logoHeight)
  } catch {
    ctx.fillStyle = COLORS.white
    ctx.font = 'bold 40px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('IMPACTO INDÍGENA', SLIDE_SIZE / 2, 300)
  }

  // Texto principal
  ctx.fillStyle = COLORS.white
  ctx.font = 'bold 38px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Lee la noticia completa', SLIDE_SIZE / 2, 430)

  // URL
  ctx.fillStyle = COLORS.yellow
  ctx.font = '28px Arial'
  ctx.fillText('impactoindigena.news', SLIDE_SIZE / 2, 490)

  // Separador
  ctx.strokeStyle = COLORS.orange
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(100, 560)
  ctx.lineTo(SLIDE_SIZE - 100, 560)
  ctx.stroke()

  // Tagline
  ctx.fillStyle = COLORS.mediumGray
  ctx.font = '26px Arial'
  ctx.fillText('Noticias sobre pueblos indígenas', SLIDE_SIZE / 2, 620)
  ctx.fillText('curadas con IA', SLIDE_SIZE / 2, 660)

  // Hashtags
  ctx.fillStyle = COLORS.orange
  ctx.font = 'bold 24px Arial'
  ctx.fillText('#PueblosIndígenas  #ImpactoIndígena', SLIDE_SIZE / 2, 730)

  // Barra multicolor inferior
  const barWidth = SLIDE_SIZE / 5
  const colors = [COLORS.blue, COLORS.green, COLORS.yellow, COLORS.orange, COLORS.red]
  colors.forEach((color, i) => {
    ctx.fillStyle = color
    ctx.fillRect(i * barWidth, SLIDE_SIZE - 12, barWidth, 12)
  })

  drawSlideNumber(ctx, 4, 4)

  return canvas.toBuffer('image/png')
}

// ---------------------------------------------------------------------------
// Main: Generate all 4 slides and upload to R2
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
    generateSlide4(storyUrl),
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
