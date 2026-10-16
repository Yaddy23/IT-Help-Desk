import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import ticketRoutes from './routes/ticket.routes.js'
import userRoutes from './routes/user.routes.js'
import assetRoutes from './routes/asset.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import reportRoutes from './routes/report.routes.js'
import knowledgeRoutes from './routes/knowledge.routes.js'
import adminRoutes from './routes/admin.routes.js'
import auditRoutes from './routes/audit.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import { errorHandler, notFound } from './middleware/error.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', true)


  app.use(helmet())
  app.use(cors({ origin: env.clientUrl, credentials: true }))
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())
  if (env.nodeEnv !== 'test') app.use(morgan('dev'))

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts, try again later' },
    validate: false,
  })

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/api/auth', authLimiter, authRoutes)
  app.use('/api/tickets', ticketRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/assets', assetRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/reports', reportRoutes)
  app.use('/api/knowledge', knowledgeRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/audit-logs', auditRoutes)
  app.use('/api/settings', settingsRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
