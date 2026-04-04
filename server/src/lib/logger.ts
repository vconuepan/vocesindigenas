import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const logDir = process.env.LOG_DIR || 'logs'
const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '14', 10)

const transports = pino.transport({
  targets: [
    // Stdout: pretty in dev, JSON in prod
    isProduction
      ? {
          target: 'pino/file',
          options: { destination: 1 },
          level: 'debug',
        }
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname,module',
            messageFormat: '{module} | {msg}',
          },
          level: 'debug',
        },
    // Rotating file: always JSON
    {
      target: 'pino-roll',
      options: {
        file: `${logDir}/server.log`,
        frequency: 'daily',
        limit: { count: retentionDays },
        mkdir: true,
      },
      level: 'debug',
    },
  ],
})

/**
 * Custom error serializer that strips bulky axios internals (request, response,
 * config) to prevent OOM from serializing full HTML responses and socket objects.
 */
function redactSecrets(str: string): string {
  return str
    .replace(/sk-[a-zA-Z0-9\-_]{20,}/g, '[REDACTED_SK_KEY]')
    .replace(/Bearer [^\s"]+/g, 'Bearer [REDACTED]')
    .replace(/password["\s:=]+[^\s,"'}]+/gi, 'password=[REDACTED]')
}

export function serializeError(err: any) {
  const serialized = pino.stdSerializers.err(err)
  if (serialized) {
    if (serialized.message) serialized.message = redactSecrets(serialized.message)
    if (serialized.stack) serialized.stack = redactSecrets(serialized.stack)
  }
  if (serialized && err?.isAxiosError) {
    return {
      type: serialized.type,
      message: serialized.message,
      stack: serialized.stack,
      code: err.code,
      status: err.response?.status,
      url: err.config?.url,
    }
  }
  return serialized
}

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      censor: '[REDACTED]',
    },
    serializers: {
      err: serializeError,
    },
  },
  transports,
)

/**
 * Create a child logger scoped to a module.
 * Usage: const log = createLogger('scheduler')
 */
export function createLogger(module: string) {
  return logger.child({ module })
}
