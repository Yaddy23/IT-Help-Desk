import type { Response } from 'express'
import { Department, User } from '../models/index.js'
import type { AuthRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginate, parsePagination } from '../utils/paginate.js'
import { audit } from '../utils/audit.js'
const EDITABLE_PROFILE = ['name', 'phone', 'jobTitle', 'location', 'avatarUrl'] as const

/** Directory — staff see everyone; employees see active staff + colleagues' names. */
export const listDirectory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>)
  const filter: Record<string, unknown> = { isActive: true }
  const q = req.query as Record<string, string | undefined>
  if (q.department) filter.department = q.department
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: rx }, { email: rx }, { jobTitle: rx }]
  }
  if (q.role) filter.role = q.role

  const { items, meta } = await paginate(User, filter, { page, limit, skip }, { name: 1 }, 'department')
  res.json({ users: items, meta })
})

export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') throw new ApiError(403, 'Only admins can create users')

  const { name, email, password, role, department, jobTitle, phone, location } = req.body as Record<string, string>
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    throw new ApiError(400, 'Name, email and a password of at least 8 characters are required')
  }
  if (role && !['admin', 'it_staff', 'employee'].includes(role)) throw new ApiError(400, 'Invalid role')

  // The pre-save hook hashes passwordHash on create.
  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: password,
    role: (role || 'employee') as never,
    department: (department || undefined) as never,
    jobTitle,
    phone,
    location,
  })

  audit({ req, action: 'user.created', targetType: 'user', targetId: String(user._id), after: { email: user.email, role: user.role } })
  // toJSON on the model already strips the password hash.
  res.status(201).json(user)
})

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await User.findById(req.params.id)
  if (!target) throw new ApiError(404, 'User not found')

  const isAdmin = req.user!.role === 'admin'
  const isSelf = String(target._id) === req.user!._id
  if (!isAdmin && !isSelf) throw new ApiError(403, 'Forbidden')

  const body = req.body as Record<string, unknown>
  const before = { role: target.role, isActive: target.isActive, department: String(target.department ?? '') }

  if (isAdmin) {
    if (body.role !== undefined) {
      if (!['admin', 'it_staff', 'employee'].includes(body.role as string)) throw new ApiError(400, 'Invalid role')
      target.role = body.role as never
    }
    if (body.isActive !== undefined) {
      if (isSelf && body.isActive === false) throw new ApiError(400, 'You cannot deactivate your own account')
      target.isActive = body.isActive as boolean
    }
    if (body.department !== undefined) target.department = (body.department || null) as never
  }

  for (const key of EDITABLE_PROFILE) {
    if (body[key] !== undefined) Object.assign(target, { [key]: body[key] })
  }
  if (body.notificationPrefs !== undefined) {
    const prefs = body.notificationPrefs as { inApp?: boolean; email?: boolean }
    target.notificationPrefs = {
      inApp: prefs.inApp ?? target.notificationPrefs.inApp,
      email: prefs.email ?? target.notificationPrefs.email,
    }
  }

  await target.save()
  if (isAdmin) {
    audit({
      req,
      action: 'user.updated',
      targetType: 'user',
      targetId: String(target._id),
      before,
      after: { role: target.role, isActive: target.isActive, department: String(target.department ?? '') },
    })
  }

  // toJSON on the model already strips the password hash.
  res.json(target)
})

/* ---------------------------- departments ---------------------------- */

export const listDepartments = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const departments = await Department.find().sort({ name: 1 })
  res.json(departments)
})

export const createDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') throw new ApiError(403, 'Only admins can create departments')
  const { name, description } = req.body as { name?: string; description?: string }
  if (!name?.trim()) throw new ApiError(400, 'Department name is required')
  const department = await Department.create({ name: name.trim(), description })
  audit({ req, action: 'department.created', targetType: 'department', targetId: String(department._id), after: { name } })
  res.status(201).json(department)
})

export const updateDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') throw new ApiError(403, 'Only admins can update departments')
  const department = await Department.findById(req.params.id)
  if (!department) throw new ApiError(404, 'Department not found')
  const { name, description } = req.body as { name?: string; description?: string }
  if (name !== undefined) department.name = name
  if (description !== undefined) department.description = description
  await department.save()
  audit({ req, action: 'department.updated', targetType: 'department', targetId: String(department._id) })
  res.json(department)
})

export const deleteDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') throw new ApiError(403, 'Only admins can delete departments')
  const department = await Department.findById(req.params.id)
  if (!department) throw new ApiError(404, 'Department not found')
  const inUse = await User.countDocuments({ department: department._id as never })
  if (inUse > 0) throw new ApiError(409, `${inUse} user(s) still belong to this department`)
  await department.deleteOne()
  audit({ req, action: 'department.deleted', targetType: 'department', targetId: String(department._id) })
  res.json({ message: 'Department deleted' })
})
