import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return

  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message })
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message)
    return res.status(400).json({ message: messages.join('. ') })
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}` })
  }

  const mongoErr = err as { code?: number; keyValue?: Record<string, unknown> }
  if (mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'field'
    return res.status(409).json({ message: `${field} already exists` })
  }

  console.error(err)
  return res.status(500).json({ message: 'Internal server error' })
}
