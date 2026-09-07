import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * El pipeline es un embudo y su orden importa: crawl alimenta a preassess,
 * preassess a assess, assess a select, y select a publish. Si una etapa corre
 * ANTES que la que la alimenta, trabaja sobre lo de la vuelta anterior y el
 * material se retrasa un ciclo entero sin que nada falle.
 *
 * OJO CON EL ALCANCE DE ESTE TEST: los horarios vivos estan en la base de datos
 * y se editan desde el panel de admin. `seed-jobs.ts` solo siembra los que aun
 * no existen —su upsert lleva `update: {}`—, asi que esto valida **la intencion
 * declarada**, no lo que corre en produccion. Para eso hay que mirar la tabla.
 */

const SEED = readFileSync(path.resolve(__dirname, 'seed-jobs.ts'), 'utf8')

/** Las horas a las que dispara un cron `M H * * *`, incluidas las listas `H1,H2`. */
function horasDe(cron: string): number[] {
  const campo = cron.trim().split(/\s+/)[1]
  if (!campo || campo.includes('*')) return []
  return campo.split(',').map(Number).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b)
}

function cronDe(job: string): string {
  const m = SEED.match(new RegExp(`jobName:\\s*'${job}',\\s*cronExpression:\\s*'([^']+)'`))
  if (!m) throw new Error(`no se encontro el job ${job} en seed-jobs.ts`)
  return m[1]
}

describe('la cadena del pipeline mantiene su orden', () => {
  it('estan los cinco jobs de la cadena', () => {
    for (const j of ['crawl_feeds', 'preassess_stories', 'assess_stories', 'select_stories', 'publish_stories']) {
      expect(() => cronDe(j)).not.toThrow()
    }
  })

  it('cada seleccion corre despues de una evaluacion', () => {
    const assess = horasDe(cronDe('assess_stories'))
    const select = horasDe(cronDe('select_stories'))
    expect(select.length).toBeGreaterThan(0)
    for (const h of select) {
      expect(
        assess.some((a) => a < h),
        `select corre a las ${h} UTC y ninguna evaluacion la precede ese dia`,
      ).toBe(true)
    }
  })

  it('cada publicacion corre despues de una seleccion', () => {
    const select = horasDe(cronDe('select_stories'))
    const publish = horasDe(cronDe('publish_stories'))
    expect(publish.length).toBeGreaterThan(0)
    for (const h of publish) {
      expect(
        select.some((s) => s < h),
        `publish corre a las ${h} UTC y ninguna seleccion la precede ese dia`,
      ).toBe(true)
    }
  })

  it('el posteo social va despues de publicar, no antes', () => {
    // Postear antes de publicar deja los enlaces apuntando a nada.
    const publish = horasDe(cronDe('publish_stories'))
    const social = horasDe(cronDe('social_auto_post'))
    for (const h of social) {
      expect(
        publish.some((p) => p <= h),
        `el posteo social a las ${h} UTC no tiene una publicacion previa`,
      ).toBe(true)
    }
  })

  it('se publica mas de una vez al dia', () => {
    // Una sola franja deja el sitio congelado 23 de cada 24 horas y el sitemap
    // de noticias con una unica hora de publicacion. Ver el comentario del seed.
    expect(horasDe(cronDe('publish_stories')).length).toBeGreaterThanOrEqual(2)
  })

  it('el seed advierte que los cron corren en UTC', () => {
    // La UI muestra America/Santiago y es facil editar un cron creyendo que se
    // escribe en hora chilena.
    expect(SEED).toMatch(/CORREN EN UTC/i)
  })
})
