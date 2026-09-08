import { createLogger } from '../lib/logger.js'
import { cleanupExpiredPendingSubscriptions, reconcileUnsubscribedFromBrevo } from '../services/subscribe.js'
import { cleanupExpiredAlertSubscriptions } from '../services/alerts.js'

const log = createLogger('job:cleanup_subscriptions')

/**
 * Purge abandoned double opt-in records that hold personal data: unconfirmed
 * newsletter pending_subscriptions and unconfirmed alert_subscriptions whose
 * confirmation token has expired. These can never be confirmed and serve no
 * purpose, yet retain the visitor's email. Confirmed subscriptions are kept.
 * Supports the storage-limitation principle of Ley 21.719.
 *
 * Y reconcilia con Brevo las bajas del boletín: el enlace del pie de la campaña
 * las registra allá y no toca esta base, así que las filas confirmadas de quien
 * ya se dio de baja se quedaban indefinidamente pese a que la Política promete
 * borrarlas. Ver `reconcileUnsubscribedFromBrevo`.
 */
export async function runCleanupSubscriptions(): Promise<void> {
  log.info('starting')
  const pendingSubscriptions = await cleanupExpiredPendingSubscriptions()
  const alertSubscriptions = await cleanupExpiredAlertSubscriptions()

  // Va aparte y no rompe el job: depende de un servicio externo, y un fallo
  // suyo no debe impedir la purga local, que es la parte que siempre funciona.
  let bajasReconciliadas = 0
  try {
    const r = await reconcileUnsubscribedFromBrevo()
    bajasReconciliadas = r.borrados
  } catch (err) {
    log.error({ err }, 'brevo reconcile failed, local cleanup still applied')
  }

  log.info({ pendingSubscriptions, alertSubscriptions, bajasReconciliadas }, 'complete')
}
