import { asyncHandler } from '../utils/asyncHandler.js'
import { User } from '../models/index.js'
import type { AuthRequest } from '../middleware/auth.js'
import type { Response } from 'express'

// Directory listing — any authenticated user can view names/roles/departments.
export const listUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = req.query as Record<string, string | undefined>
  const filter: Record<string, unknown> = { isActive: true }
  if (q.department) filter.department = q.department
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: rx }, { email: rx }]
  }

  const limit = Math.min(200, Number(q.limit) || 50)
  const users = await User.find(filter)
    .populate('department', 'name')
    .select('name email role department jobTitle location avatarUrl')
    .sort({ name: 1 })
    .limit(limit)
    .lean()

  res.json(users)
})

export const getUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id)
    .populate('department', 'name')
    .select('name email role department jobTitle location avatarUrl createdAt')
  res.json(user)
})
