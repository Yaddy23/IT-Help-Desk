import type { Response } from 'express'
import { Notification } from '../models/Notification.js'
import type { AuthRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginate, parsePagination } from '../utils/paginate.js'

export const listNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await paginate(
    Notification,
    { recipient: req.user!._id },
    { page, limit, skip },
    { createdAt: -1 },
  )
  res.json({ notifications: items, meta })
})

export const unreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const count = await Notification.countDocuments({ recipient: req.user!._id, isRead: false })
  res.json({ count })
})

export const markRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user!._id })
  if (!notification) throw new ApiError(404, 'Notification not found')

  notification.isRead = true
  notification.readAt = new Date()
  await notification.save()
  res.json(notification)
})

export const markAllRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Notification.updateMany(
    { recipient: req.user!._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  )
  res.json({ message: 'All notifications marked read' })
})
