import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Response } from 'express'
import { env } from '../config/env.js'
import { sendMail } from '../config/mailer.js'
import { User } from '../models/index.js'
import type { AuthRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  generateResetToken,
  refreshCookie,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
} from '../utils/tokens.js'

function issueSession(res: Response, user: { _id: unknown; role: 'admin' | 'it_staff' | 'employee'; email: string }) {
  const accessToken = signAccessToken(user as never)
  const refreshToken = signRefreshToken(user as never)
  res.cookie(refreshCookie, refreshToken, refreshCookieOptions())
  return accessToken
}

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) throw new ApiError(400, 'Email and password are required')

  const user = await User.findOne({ email: email.toLowerCase() }).populate('department')
  if (!user || !user.isActive) throw new ApiError(401, 'Invalid email or password')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new ApiError(401, 'Invalid email or password')

  const accessToken = issueSession(res, user)
  res.json({ user, accessToken })
})

export const refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const token = req.cookies?.[refreshCookie]
  // Debug: log cookies and token presence
  console.log('Refresh cookies:', req.cookies)
  console.log('Refresh token present:', !!token)
  if (!token) {
    console.log('No refresh token found')
    throw new ApiError(401, 'No refresh token')
  }

  let payload: { sub: string }
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret) as { sub: string }
  } catch {
    res.clearCookie(refreshCookie, { path: '/' })
    throw new ApiError(401, 'Invalid refresh token')
  }

  const user = await User.findById(payload.sub).populate('department')
  if (!user || !user.isActive) throw new ApiError(401, 'Not authenticated')

  const accessToken = issueSession(res, user)
  res.json({ user, accessToken })
})

export const logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.clearCookie(refreshCookie, { path: '/' })
  res.json({ message: 'Logged out' })
})

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!._id).populate('department')
  if (!user) throw new ApiError(404, 'User not found')
  res.json(user)
})

export const forgotPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email } = req.body as { email?: string }
  if (!email) throw new ApiError(400, 'Email is required')

  const user = await User.findOne({ email: email.toLowerCase() })
  // Always respond the same way so we don't leak which emails exist.
  if (user) {
    const { token, expires } = generateResetToken()
    user.resetPasswordToken = token
    user.resetPasswordExpires = expires
    await user.save()

    const resetUrl = `${env.clientUrl}/reset-password?token=${token}`
    await sendMail(
      user.email,
      'Reset your IT Help Desk password',
      `<p>Hi ${user.name},</p>
       <p>Click the link below to reset your password. It expires in 1 hour.</p>
       <p><a href="${resetUrl}">${resetUrl}</a></p>
       <p>If you didn't request this, you can ignore this email.</p>`,
    )
  }
  res.json({ message: 'If that email exists, a reset link has been sent' })
})

export const resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string }
  if (!token || !password) throw new ApiError(400, 'Token and new password are required')
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters')

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  })
  if (!user) throw new ApiError(400, 'Invalid or expired reset link')

  user.passwordHash = password
  user.resetPasswordToken = null
  user.resetPasswordExpires = null
  await user.save()

  res.json({ message: 'Password has been reset' })
})

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string
    newPassword?: string
  }
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required')
  }
  if (newPassword.length < 8) throw new ApiError(400, 'Password must be at least 8 characters')

  const user = await User.findById(req.user!._id)
  if (!user) throw new ApiError(404, 'User not found')

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) throw new ApiError(401, 'Current password is incorrect')

  user.passwordHash = newPassword
  await user.save()
  res.json({ message: 'Password updated' })
})
