import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Keep in sync with server/src/jobs/handlers.ts
// All jobs start disabled — enable via admin UI after verifying config.
/**
 * TODOS LOS CRON CORREN EN UTC, no en hora de Chile.
 *
 * `cron.schedule()` se llama sin opcion de zona (jobs/scheduler.ts), asi que usa
 * la del proceso — UTC en el App Service. El `America/Santiago` que devuelve
 * `/admin/jobs/server-time` es para que la UI muestre la hora local, y es facil
 * confundirse al editar un cron desde el panel creyendo que se escribe en hora
 * chilena. Verificado el 7-sep-2026 contra el sitemap de noticias: con
 * `0 11 * * *`, todas las publicaciones caen a las 11 UTC.
 *
 * Chile esta en UTC-3 (verano) o UTC-4 (invierno), asi que la hora local de una
 * misma expresion **se corre una hora** al cambiar la estacion.
 *
 * LA CADENA DEL PIPELINE ES UN EMBUDO, y su orden importa: crawl alimenta a
 * preassess, preassess a assess, assess a select, y select a publish. Cada etapa
 * debe correr DESPUES de la que la alimenta, o trabaja sobre lo de la vuelta
 * anterior.
 *
 * Publicar dos veces al dia —11 y 23 UTC, o sea 8 y 20 en Chile— y no una sola:
 * el material se prepara a lo largo del dia (crawl cada 6 h, preassess 4 veces,
 * assess 2) y salia todo de golpe en una unica corrida. Una historia evaluada a
 * las 21 UTC esperaba **13 horas** a la seleccion del dia siguiente, el sitio
 * quedaba congelado 23 de cada 24 horas, y el sitemap de noticias mostraba **una
 * sola hora de publicacion**. Reparte el mismo trabajo, no lo duplica: el costo
 * del job es por historia —traduccion e imagen—, no por corrida.
 */
const JOB_SEEDS: Array<{ jobName: string; cronExpression: string; enabled?: boolean }> = [
  // --- Pipeline --- (horas UTC; en Chile, restar 3 en verano y 4 en invierno)
  { jobName: 'crawl_feeds',             cronExpression: '0 */6 * * *' },
  { jobName: 'preassess_stories',       cronExpression: '0 1,7,13,19 * * *' },
  { jobName: 'assess_stories',          cronExpression: '0 9,21 * * *' },
  { jobName: 'select_stories',          cronExpression: '0 10,22 * * *' },
  { jobName: 'publish_stories',         cronExpression: '0 11,23 * * *' },
  // --- Social ---
  // Dos franjas, y ya estaba asi en produccion antes de tocar nada: el 7-sep se
  // leyo la base y decia `0 9,18`, no lo que este archivo declaraba. Alguien lo
  // habia escalonado desde el panel y el seed nunca se entero — `update: {}`.
  // Se copia el valor real en vez de imponer otro.
  //
  // No repite posts: los candidatos excluyen lo ya posteado en cada canal
  // (socialMedia.ts, `findAutoPostCandidates`).
  { jobName: 'social_auto_post',        cronExpression: '0 9,18 * * *' },
  { jobName: 'bluesky_update_metrics',  cronExpression: '0 */6 * * *' },
  { jobName: 'mastodon_update_metrics', cronExpression: '0 4 * * *' },
  { jobName: 'instagram_update_metrics',cronExpression: '0 */6 * * *' },
  { jobName: 'linkedin_update_metrics', cronExpression: '0 */6 * * *' },
  { jobName: 'facebook_update_metrics', cronExpression: '0 */6 * * *' },
  // Vigilancia de tokens — habilitados por defecto: son lo que evita que el
  // posteo vuelva a caerse en silencio. Instagram renueva solo; LinkedIn no
  // puede (solo partners MDP), así que su job avisa para reautorizar a mano.
  { jobName: 'instagram_refresh_token', cronExpression: '30 5 * * *', enabled: true },
  { jobName: 'linkedin_check_token',    cronExpression: '0 6 * * *',  enabled: true },
  // Facebook tampoco renueva solo: media hora después del de LinkedIn.
  { jobName: 'facebook_check_token',    cronExpression: '30 6 * * *', enabled: true },
  // --- Newsletter ---
  // generate_newsletter: miércoles y sábados 4 AM UTC (2× por semana — genera Jue y Lun)
  { jobName: 'generate_newsletter',       cronExpression: '0 4 * * 3,6' },
  // send_newsletter: lunes y jueves 12 PM UTC (~9 AM Chile)
  { jobName: 'send_newsletter',           cronExpression: '0 12 * * 1,4' },
  // send_private_newsletter: lunes y jueves 12:30 PM UTC (offset para no solapar)
  { jobName: 'send_private_newsletter',   cronExpression: '30 12 * * 1,4' },
  // send_weekly_newsletter: lunes 9 AM UTC (~6 AM Chile) — resumen semana anterior
  { jobName: 'send_weekly_newsletter',    cronExpression: '0 9 * * 1',  enabled: true },
  // send_community_digest: lunes 8 AM UTC (~5 AM Chile) — enabled by default
  { jobName: 'send_community_digest',     cronExpression: '0 8 * * 1',  enabled: true },
  // send_alerts: diario 9 AM UTC (~6 AM Chile) — enabled by default
  { jobName: 'send_alerts',               cronExpression: '0 9 * * *',  enabled: true },
  // --- Content ---
  // generate_editorial: domingos 5 AM UTC (antes del lunes)
  { jobName: 'generate_editorial',  cronExpression: '0 5 * * 0' },
  // scrape_docip: diario 2 AM UTC (baja carga horaria)
  { jobName: 'scrape_docip',        cronExpression: '0 2 * * *' },
  // ingest_agenda: diario 4 AM UTC — pobla "Incidencia Internacional" desde RSS/iCal
  { jobName: 'ingest_agenda',       cronExpression: '0 4 * * *',  enabled: true },
  // --- Data retention (Ley 21.719) — enabled by default ---
  // cleanup_auth_data: diario 3 AM UTC — purga refresh tokens y magic links expirados
  { jobName: 'cleanup_auth_data',      cronExpression: '0 3 * * *',  enabled: true },
  // cleanup_subscriptions: diario 3:30 AM UTC — purga opt-ins no confirmados expirados
  { jobName: 'cleanup_subscriptions',  cronExpression: '30 3 * * *', enabled: true },
]

async function main() {
  const results = await Promise.all(
    JOB_SEEDS.map(({ jobName, cronExpression, enabled = false }) =>
      // `update: {}` a proposito: este seed NO pisa lo que ya esta en la base.
      // Los horarios vivos se editan desde el panel de admin, que ademas
      // reprograma en caliente (`reloadJob`). Cambiar este archivo solo afecta a
      // los jobs que aun no existen — un entorno nuevo, o un job recien
      // agregado.
      prisma.jobRun.upsert({
        where: { jobName },
        update: {},
        create: { jobName, cronExpression, enabled },
      })
    )
  )

  console.log(`Seeded ${results.length} job runs`)
  results.forEach((j) => console.log(`  ${j.enabled ? '✓' : '○'} ${j.jobName}  (${j.cronExpression})`))
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
