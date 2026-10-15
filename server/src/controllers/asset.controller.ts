import type { Request, Response } from 'express'
import { Asset, AssetAssignment, MaintenanceRecord, User } from '../models/index.js'
import type { AuthRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginate, parsePagination } from '../utils/paginate.js'
import { notifyAsync } from '../services/notification.service.js'

const STAFF_ROLES = new Set(['admin', 'it_staff'])

function buildFilter(req: AuthRequest) {
  const q = req.query as Record<string, string | undefined>
  const filter: Record<string, unknown> = {}

  // Employees only see assets currently assigned to them.
  if (!STAFF_ROLES.has(req.user!.role)) {
    filter.assignedTo = req.user!._id
  } else {
    if (q.status) filter.status = q.status
    if (q.deviceType) filter.deviceType = q.deviceType
    if (q.assignedTo) filter.assignedTo = q.assignedTo
    if (q.unassigned === 'true') filter.assignedTo = null
    if (q.warranty === 'expiring') {
      const soon = new Date()
      soon.setMonth(soon.getMonth() + 3)
      filter.warrantyExpiry = { $gte: new Date(), $lte: soon }
    }
  }

  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ assetTag: rx }, { serialNumber: rx }, { brand: rx }, { model: rx }]
  }
  return filter
}

export const listAssets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await paginate(Asset, buildFilter(req), { page, limit, skip }, { createdAt: -1 }, 'assignedTo')
  res.json({ assets: items, meta })
})

export const getAsset = asyncHandler(async (req: AuthRequest, res: Response) => {
  const asset = await Asset.findById(req.params.id).populate('assignedTo', 'name email role')
  if (!asset) throw new ApiError(404, 'Asset not found')

  if (!STAFF_ROLES.has(req.user!.role) && String(asset.assignedTo?._id ?? asset.assignedTo) !== req.user!._id) {
    throw new ApiError(403, 'Forbidden')
  }

  const [assignments, maintenance] = await Promise.all([
    AssetAssignment.find({ asset: asset._id }).sort({ assignedAt: -1 }).populate('employee', 'name email').populate('assignedBy', 'name'),
    MaintenanceRecord.find({ asset: asset._id }).sort({ date: -1 }),
  ])

  res.json({ asset, assignments, maintenance })
})

export const createAsset = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')

  const { assetTag, ...rest } = req.body as { assetTag?: string } & Record<string, unknown>
  if (!assetTag?.trim()) throw new ApiError(400, 'Asset tag is required')

  const asset = await Asset.create({ ...rest, assetTag: assetTag.trim().toUpperCase() })
  res.status(201).json(asset)
})

export const updateAsset = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')

  const asset = await Asset.findById(req.params.id)
  if (!asset) throw new ApiError(404, 'Asset not found')

  const allowed = [
    'serialNumber',
    'deviceType',
    'brand',
    'model',
    'status',
    'location',
    'purchaseDate',
    'warrantyExpiry',
    'cost',
    'notes',
  ] as const

  const body = req.body as Record<string, unknown>
  for (const key of allowed) {
    if (body[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(asset as any)[key] = body[key]
    }
  }

  await asset.save()
  res.json(asset)
})

export const deleteAsset = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') throw new ApiError(403, 'Only admins can delete assets')

  const asset = await Asset.findById(req.params.id)
  if (!asset) throw new ApiError(404, 'Asset not found')
  if (asset.assignedTo) throw new ApiError(400, 'Return the asset before deleting it')

  await Promise.all([
    AssetAssignment.deleteMany({ asset: asset._id }),
    MaintenanceRecord.deleteMany({ asset: asset._id }),
    asset.deleteOne(),
  ])
  res.json({ message: 'Asset deleted' })
})

export const assignAsset = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')

  const { employeeId, conditionOut, notes } = req.body as {
    employeeId?: string
    conditionOut?: string
    notes?: string
  }
  if (!employeeId) throw new ApiError(400, 'employeeId is required')

  const employee = await User.findById(employeeId)
  if (!employee || !employee.isActive) throw new ApiError(400, 'Employee not found')

  const asset = await Asset.findById(req.params.id)
  if (!asset) throw new ApiError(404, 'Asset not found')
  if (asset.status === 'retired') throw new ApiError(400, 'Retired assets cannot be assigned')

  const active = await AssetAssignment.findOne({ asset: asset._id, returnedAt: null })
  if (active) throw new ApiError(409, 'Asset is already assigned — return it first')

  await AssetAssignment.create({
    asset: asset._id,
    employee: employeeId,
    assignedBy: req.user!._id,
    conditionOut,
    notes,
  })

  asset.assignedTo = employeeId as never
  asset.status = 'in_use'
  await asset.save()

  notifyAsync({
    userId: employeeId,
    actorId: req.user!._id,
    type: 'assignment_created',
    title: `Asset ${asset.assetTag} assigned to you`,
    message: `${req.user!.name} assigned you a ${asset.deviceType}${asset.brand ? ` (${asset.brand} ${asset.model ?? ''})` : ''}.`,
    link: `/assets/${asset._id}`,
  })

  res.json(asset)
})

export const returnAsset = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')

  const { conditionIn, notes } = req.body as { conditionIn?: string; notes?: string }

  const asset = await Asset.findById(req.params.id)
  if (!asset) throw new ApiError(404, 'Asset not found')

  const active = await AssetAssignment.findOne({ asset: asset._id, returnedAt: null })
  if (!active) throw new ApiError(400, 'Asset is not currently assigned')

  active.returnedAt = new Date()
  active.conditionIn = conditionIn
  if (notes) active.notes = active.notes ? `${active.notes}\n${notes}` : notes
  await active.save()

  asset.assignedTo = null
  asset.status = 'in_stock'
  await asset.save()
  res.json(asset)
})

export const addMaintenance = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')

  const asset = await Asset.findById(req.params.id)
  if (!asset) throw new ApiError(404, 'Asset not found')

  const { type, description, performedBy, cost, downtimeHours, relatedTicket, date } = req.body as {
    type?: string
    description?: string
  } & Record<string, unknown>
  if (!type || !description) throw new ApiError(400, 'Type and description are required')

  const record = await MaintenanceRecord.create({
    asset: asset._id,
    type: type as 'repair' | 'upgrade' | 'inspection' | 'replacement',
    description,
    performedBy: performedBy as string | undefined,
    cost: cost as number | undefined,
    downtimeHours: downtimeHours as number | undefined,
    relatedTicket: (relatedTicket as string) || null,
    date: date as Date | undefined,
  })

  res.status(201).json(record)
})

export const assetStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')

  const soon = new Date()
  soon.setMonth(soon.getMonth() + 3)

  const [total, byStatus, byType, warrantyExpiring] = await Promise.all([
    Asset.countDocuments({}),
    Asset.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Asset.aggregate([{ $group: { _id: '$deviceType', count: { $sum: 1 } } }]),
    Asset.countDocuments({ warrantyExpiry: { $gte: new Date(), $lte: soon } }),
  ])

  res.json({ total, byStatus, byType, warrantyExpiring })
})
