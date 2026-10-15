import type { Response } from 'express'
import { AuditLog } from '../models/index.js'
import type { AuthRequest } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginate, parsePagination } from '../utils/paginate.js'

export const listAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = req.query as Record<string, string | undefined>
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>)

  const filter: Record<string, unknown> = {}
  if (q.action) filter.action = q.action
  if (q.targetType) filter.targetType = q.targetType
  if (q.actor) filter.actor = q.actor

  // Never let populated actor docs carry password hashes out of the API.
  const { items, meta } = await paginate(AuditLog, filter, { page, limit, skip }, { createdAt: -1 }, [
    { path: 'actor', select: 'name email role' },
  ])
  res.json({ logs: items, meta })
})

export const auditActions = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const actions = await AuditLog.distinct('action')
  res.json(actions)
})
