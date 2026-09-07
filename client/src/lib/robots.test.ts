import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * El `robots.txt` distingue dos clases de bot, y confundirlas cuesta caro en
 * direcciones opuestas:
 *
 * - Bloquear un bot de BUSQUEDA saca al sitio de donde la gente busca noticias.
 *   Con el embudo de suscripcion como esta, cerrar una puerta por la que entra
 *   gente es el error mas caro que se puede cometer aqui.
 * - Dejar pasar un bot de ENTRENAMIENTO regala el trabajo de curaduria sin
 *   recibir ni un lector ni una atribucion.
 *
 * Este test fija las dos mitades de esa decision, tomada el 6-sep-2026.
 */

const ROBOTS = readFileSync(path.resolve(__dirname, '../../public/robots.txt'), 'utf8')

/** Los `User-agent` que tienen un `Disallow: /` en su bloque. */
function bloqueados(txt: string): string[] {
  const out: string[] = []
  let agente: string | null = null
  for (const linea of txt.split('\n')) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const [clave, ...resto] = l.split(':')
    const valor = resto.join(':').trim()
    const k = clave.trim().toLowerCase()
    if (k === 'user-agent') agente = valor
    else if (k === 'disallow' && valor === '/' && agente) out.push(agente)
  }
  return out
}

describe('robots.txt: bloquea el entrenamiento, nunca la busqueda', () => {
  const lista = bloqueados(ROBOTS)

  // Los que traen lectores y citan la fuente. Bloquear uno de estos es el
  // error caro: no debe pasar ni por descuido.
  const DE_BUSQUEDA = [
    'Googlebot',
    'Googlebot-News',
    'Bingbot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'Claude-SearchBot',
    'Claude-User',
    'Applebot',
  ]

  for (const bot of DE_BUSQUEDA) {
    it(`no bloquea ${bot}, que trae lectores`, () => {
      expect(lista, `${bot} quedo bloqueado: saca al sitio de esa busqueda`).not.toContain(bot)
    })
  }

  it('no hay un Disallow: / global que tape todo el sitio', () => {
    // El bloque `*` debe permitir; un `Disallow: /` ahi es la forma mas rapida
    // de desaparecer de Google entero.
    expect(lista).not.toContain('*')
    expect(ROBOTS).toMatch(/User-agent:\s*\*[\s\S]*?Allow:\s*\//)
  })

  it('bloquea los nueve de entrenamiento que el dominio viejo ya declaraba', () => {
    for (const bot of [
      'Amazonbot',
      'Applebot-Extended',
      'Bytespider',
      'CCBot',
      'ClaudeBot',
      'CloudflareBrowserRenderingCrawler',
      'Google-Extended',
      'GPTBot',
      'meta-externalagent',
    ]) {
      expect(lista, `falta bloquear ${bot}`).toContain(bot)
    }
  })

  it('declara la señal de contenido: busqueda si, entrenamiento no', () => {
    expect(ROBOTS).toContain('Content-Signal: search=yes,ai-train=no,use=reference')
  })

  it('sigue declarando los dos sitemaps', () => {
    // Si se pierden, Google deja de tener el indice completo del sitio.
    expect(ROBOTS).toContain('Sitemap: https://vocesindigenas.org/sitemap.xml')
    expect(ROBOTS).toContain('Sitemap: https://vocesindigenas.org/sitemap-news.xml')
  })

  it('`Applebot-Extended` esta bloqueado pero `Applebot` no', () => {
    // Son distintos: el primero es la señal de entrenamiento de Apple, el
    // segundo el rastreador de Siri y Spotlight. Confundirlos cuesta visibilidad.
    expect(lista).toContain('Applebot-Extended')
    expect(lista).not.toContain('Applebot')
  })
})
