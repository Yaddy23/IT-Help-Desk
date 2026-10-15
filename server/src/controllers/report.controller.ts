import type { Request, Response } from 'express'
import { Asset, MaintenanceRecord, Ticket, TicketComment } from '../models/index.js'
import type { AuthRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const STAFF_ROLES = new Set(['admin', 'it_staff'])

function requireStaff(req: AuthRequest) {
  if (!STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n')
}

function sendCsvOrJson(
  req: Request,
  res: Response,
  rows: Record<string, unknown>[],
  columns: string[],
  filename: string,
) {
  if ((req.query as Record<string, string>).format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(toCsv(rows, columns))
    return
  }
  res.json(rows)
}

/** Buckets tickets into days (or weeks/months for longer ranges). */
function pickBucket(days: number): '$dayOfYear' | '$week' | '$month' {
  if (days <= 60) return '$dayOfYear'
  if (days <= 400) return '$week'
  return '$month'
}

export const ticketsOverTime = asyncHandler(async (req: AuthRequest, res: Response) => {
  requireStaff(req)
  const days = Math.min(Number((req.query as Record<string, string>).days ?? 30), 365)
  const since = new Date(Date.now() - days * 24 * 3600_000)
  const bucket = pickBucket(days)

  const rows = await Ticket.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          bucket: { [bucket]: '$createdAt' },
          year: { $year: '$createdAt' },
        },
        created: { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $and: [{ $ifNull: ['$resolvedAt', false] }, { $gte: ['$resolvedAt', since] }] }, 1, 0],
          },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.bucket': 1 } },
    { $project: { _id: 0, bucket: '$_id.bucket', year: '$_id.year', created: 1, resolved: 1 } },
  ])

  sendCsvOrJson(req as Request, res, rows as Record<string, unknown>[], ['bucket', 'year', 'created', 'resolved'], 'tickets-over-time.csv')
})

export const byCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  requireStaff(req)
  const rows = await Ticket.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
  sendCsvOrJson(req as Request, res, rows as Record<string, unknown>[], ['_id', 'count'], 'tickets-by-category.csv')
})

export const byPriority = asyncHandler(async (req: AuthRequest, res: Response) => {
  requireStaff(req)
  const rows = await Ticket.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
  sendCsvOrJson(req as Request, res, rows as Record<string, unknown>[], ['_id', 'count'], 'tickets-by-priority.csv')
})

export const resolutionTimes = asyncHandler(async (req: AuthRequest, res: Response) => {
  requireStaff(req)
  const rows = await Ticket.aggregate([
    { $match: { resolvedAt: { $ne: null }, createdAt: { $ne: null } } },
    {
      $project: {
        ticketNumber: 1,
        title: 1,
        category: 1,
        priority: 1,
        hoursToResolve: {
          $round: [{ $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600_000] }, 1],
        },
        slaMet: { $lte: ['$resolvedAt', '$slaDueAt'] },
      },
    },
    { $sort: { hoursToResolve: -1 } },
    { $limit: 500 },
  ])

  sendCsvOrJson(
    req as Request,
    res,
    rows as unknown as Record<string, unknown>[],
    ['ticketNumber', 'title', 'category', 'priority', 'hoursToResolve', 'slaMet'],
    'resolution-times.csv',
  )
})

export const topProblemAssets = asyncHandler(async (req: AuthRequest, res: Response) => {
  requireStaff(req)
  const rows = await Ticket.aggregate([
    { $match: { relatedAsset: { $ne: null } } },
    { $group: { _id: '$relatedAsset', ticketCount: { $sum: 1 } } },
    { $sort: { ticketCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'assets',
        localField: '_id',
        foreignField: '_id',
        as: 'asset',
      },
    },
    { $unwind: '$asset' },
    {
      $project: {
        _id: 0,
        assetId: '$asset._id',
        assetTag: '$asset.assetTag',
        brand: '$asset.brand',
        model: '$asset.model',
        deviceType: '$asset.deviceType',
        ticketCount: 1,
      },
    },
  ])

  sendCsvOrJson(
    req as Request,
    res,
    rows as Record<string, unknown>[],
    ['assetTag', 'brand', 'model', 'deviceType', 'ticketCount'],
    'top-problem-assets.csv',
  )
})

export const warrantyExpiring = asyncHandler(async (req: AuthRequest, res: Response) => {
  requireStaff(req)
  const months = Math.min(Number((req.query as Record<string, string>).months ?? 6), 24)
  const until = new Date()
  until.setMonth(until.getMonth() + months)

  const rows = await Asset.find({ warrantyExpiry: { $gte: new Date(), $lte: until } })
    .sort({ warrantyExpiry: 1 })
    .select('assetTag brand model deviceType warrantyExpiry cost location')
    .lean()

  sendCsvOrJson(
    req as Request,
    res,
    rows as unknown as Record<string, unknown>[],
    ['assetTag', 'brand', 'model', 'deviceType', 'warrantyExpiry', 'cost', 'location'],
    'warranty-expiring.csv',
  )
})

/** Summary tiles for the staff reports page. */
export const reportSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  requireStaff(req)

  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600_000)

  const [avgResolution, slaBreached, firstResponse, maintenanceSpendRows] = await Promise.all([
    Ticket.aggregate([
      { $match: { resolvedAt: { $ne: null } } },
      { $group: { _id: null, hours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600_000] } } } },
    ]),
    Ticket.countDocuments({ slaDueAt: { $lt: now }, status: { $nin: ['resolved', 'closed'] } }),
    TicketComment.aggregate([
      { $match: { createdAt: { $gte: monthAgo } } },
      { $group: { _id: '$ticket', comments: { $sum: 1 } } },
      { $group: { _id: null, avgComments: { $avg: '$comments' } } },
    ]),
    MaintenanceRecord.aggregate([{ $group: { _id: null, total: { $sum: '$cost' } } }]),
  ])

  res.json({
    avgResolutionHours: Math.round((avgResolution[0]?.hours ?? 0) * 10) / 10,
    slaBreached,
    engagement: Math.round((firstResponse[0]?.avgComments ?? 0) * 10) / 10,
    maintenanceSpend: maintenanceSpendRows[0]?.total ?? 0,
  })
})
