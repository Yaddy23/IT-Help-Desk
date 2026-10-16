import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { IUser } from '../models/User.js'

export function signAccessToken(user: Pick<IUser, '_id' | 'role'>) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtAccessSecret, {
    expiresIn: '15m',
  })
}

export function generateResetToken() {
  return { token: crypto.randomBytes(32).toString('hex'), expires: new Date(Date.now() + 3600_000) }
}