import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import type { Role } from '../models/User.js'

export interface AuthRequest extends Request {
  user?: {
    _id: string
    role: Role
    name: string
    email: string
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Not authenticated' })

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as { sub: string }
    const user = await User.findById(payload.sub)
    if (!user || !user.isActive) return res.status(401).json({ message: 'Not authenticated' })
    req.user = { _id: String(user._id), role: user.role, name: user.name, email: user.email }
    next()
  } catch {
    return res.status(401).json({ message: 'Not authenticated' })
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' })
    next()
  }
}
