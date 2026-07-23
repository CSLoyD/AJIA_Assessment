import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { authRouter } from './routes/auth'
import { documentsRouter } from './routes/documents'

function allowedOrigins(): string | string[] {
  const configured = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000'
  if (process.env.NODE_ENV === 'production') {
    return configured
  }

  const localMatch = configured.match(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)
  if (!localMatch) {
    return configured
  }

  const port = localMatch[2] ?? ''
  return [configured, `http://localhost${port}`, `http://127.0.0.1${port}`]
}

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: allowedOrigins(),
      credentials: true,
    }),
  )
  app.use(cookieParser())
  app.use(express.json())

  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/auth', authRouter)
  app.use('/documents', documentsRouter)

  return app
}
