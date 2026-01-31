import 'dotenv/config'
import 'express-async-errors'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import type { Request, Response, NextFunction } from 'express'
import { createLogger } from './lib/logger.js'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin/index.js'
import publicRouter from './routes/public/index.js'

const httpLog = createLogger('http')

const app = express()

// Trust proxy for correct IP detection behind reverse proxy (Render.com)
app.set('trust proxy', 1)

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false,
}))

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

// Request logging — single line per request, no redundant fields
app.use((req, res, next) => {
  if (req.originalUrl === '/health') return next()
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    const status = res.statusCode
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    httpLog[level](`${req.method} ${req.originalUrl} ${status} ${ms}ms`)
  })
  next()
})

// Routes
app.use('/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api', publicRouter)

// 404 handler for unmatched routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler — must be last middleware (4 parameters required)
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const log = createLogger('http')
  log.error({ err, method: req.method, url: req.originalUrl }, 'unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

export default app
