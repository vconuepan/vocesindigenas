import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import healthRouter from './routes/health.js'
import adminRouter from './routes/admin/index.js'
import publicRouter from './routes/public/index.js'

const app = express()
const PORT = process.env.PORT || 3001

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
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  }
}))

app.use(express.json())

// Routes
app.use('/health', healthRouter)
app.use('/api/admin', adminRouter)
app.use('/api', publicRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)

  // TODO: Initialize scheduler after DB connection is confirmed
  // import('./jobs/scheduler.js').then(m => m.initScheduler())
})

export default app
