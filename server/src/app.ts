import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin/index.js'
import publicRouter from './routes/public/index.js'

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

// Request logging
app.use((req, res, next) => {
  const start = Date.now()
  console.log(`→ ${req.method} ${req.originalUrl}`)
  res.on('finish', () => {
    const ms = Date.now() - start
    console.log(`← ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`)
  })
  next()
})

// Routes
app.use('/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api', publicRouter)

export default app
