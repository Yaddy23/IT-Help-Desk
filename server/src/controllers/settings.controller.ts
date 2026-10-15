import type { Response } from 'express'
import { Settings } from '../models/index.js'
import type { AuthRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'

export const getSettings = asyncHandler(async (_req: AuthRequest, res: Response) => {
  let settings = await Settings.findOne()
  if (!settings) settings = await Settings.create({})
  res.json(settings)
})

export const updateSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') throw new ApiError(403, 'Only admins can change settings')

  let settings = await Settings.findOne()
  if (!settings) settings = await Settings.create({})

  const body = req.body as Record<string, unknown>
  if (typeof body.companyName === 'string') settings.companyName = body.companyName
  if (typeof body.emailNotificationsEnabled === 'boolean') {
    settings.emailNotificationsEnabled = body.emailNotificationsEnabled
  }
  if (body.slaHours && typeof body.slaHours === 'object') {
    const sla = body.slaHours as Record<string, unknown>
    for (const key of ['low', 'medium', 'high', 'critical'] as const) {
      const value = Number(sla[key])
      if (Number.isFinite(value) && value > 0) settings.slaHours[key] = value
    }
  }
  if (Array.isArray(body.ticketCategories)) {
    settings.ticketCategories = (body.ticketCategories as unknown[]).map(String)
  }
  if (Array.isArray(body.deviceTypes)) {
    settings.deviceTypes = (body.deviceTypes as unknown[]).map(String)
  }

  await settings.save()
  audit({ req, action: 'settings.updated', targetType: 'settings', targetId: String(settings._id) })
  res.json(settings)
})
