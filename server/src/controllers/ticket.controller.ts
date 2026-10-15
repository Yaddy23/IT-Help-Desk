import type { Request, Response } from 'express'
import path from 'path'
import { TicketComment } from '../models/TicketComment.js'
import { Ticket, slaDueFor } from '../models/Ticket.js'
import type { AuthRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { parsePagination, paginate } from '../utils/paginate.js'
import { nextTicketNumber } from '../utils/ticketNumber.js'

const STAFF_ROLES = new Set(['admin', 'it_staff'])

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['assigned', 'in_progress', 'resolved', 'closed'],
  assigned: ['in_progress', 'pending_user', 'resolved', 'closed', 'open'],
  in_progress: ['pending_user', 'resolved', 'assigned', 'open'],
  pending_user: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'open'],
  closed: ['open'],
}

function buildFilter(req: AuthRequest) {
  const q = req.query as Record<string, string | undefined>
  const filter: Record<string, unknown> = {}

  // Employees only ever see their own tickets.
  if (!STAFF_ROLES.has(req.user!.role)) {
    filter.requester = req.user!._id
  } else if (q.scope === 'mine') {
    filter.assignee = req.user!._id
  }

  if (q.status) filter.status = q.status
  if (q.priority) filter.priority = q.priority
  if (q.category) filter.category = q.category
  if (q.requester) filter.requester = q.requester
  if (q.assignee) filter.assignee = q.assignee
  if (q.overdue === 'true') {
    filter.slaDueAt = { $lt: new Date() }
    filter.status = { $nin: ['resolved', 'closed'] }
  }
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ title: rx }, { description: rx }, { ticketNumber: rx }]
  }
  return filter
}

export const listTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>)
  const { items, meta } = await paginate(Ticket, buildFilter(req), { page, limit, skip }, { createdAt: -1 }, [
    'requester',
    'assignee',
    'relatedAsset',
  ])
  res.json({ tickets: items, meta })
})

export const getTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('requester', 'name email role department avatarUrl')
    .populate('assignee', 'name email role avatarUrl')
    .populate('relatedAsset', 'assetTag deviceType brand model')
  if (!ticket) throw new ApiError(404, 'Ticket not found')

  // Employees can only open their own tickets.
  if (!STAFF_ROLES.has(req.user!.role) && String(ticket.requester) !== req.user!._id) {
    throw new ApiError(403, 'Forbidden')
  }

  const isStaff = STAFF_ROLES.has(req.user!.role)
  const comments = await TicketComment.find({ ticket: ticket._id })
    .sort({ createdAt: 1 })
    .populate('author', 'name role avatarUrl')

  res.json({
    ticket,
    comments: comments.filter((c) => isStaff || !c.isInternal),
  })
})

export const createTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, description, category, priority, relatedAsset } = req.body as {
    title?: string
    description?: string
    category?: string
    priority?: string
    relatedAsset?: string
  }
  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, 'Title and description are required')
  }

  const ticket = await Ticket.create({
    ticketNumber: await nextTicketNumber(),
    requester: req.user!._id,
    title: title.trim(),
    description,
    category: category as never,
    priority: priority as never,
    relatedAsset: relatedAsset || null,
    slaDueAt: slaDueFor((priority as 'low') ?? 'medium'),
  })

  res.status(201).json(ticket)
})

export const updateTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Only IT staff can update tickets')

  const ticket = await Ticket.findById(req.params.id)
  if (!ticket) throw new ApiError(404, 'Ticket not found')

  const { status, assignee, priority } = req.body as {
    status?: string
    assignee?: string
    priority?: string
  }

  if (assignee !== undefined) {
    ticket.assignee = (assignee || null) as never
    if (assignee && ticket.status === 'open') ticket.status = 'assigned'
  }

  if (priority && priority !== ticket.priority) {
    ticket.priority = priority as never
    ticket.slaDueAt = slaDueFor(priority as 'low')
  }

  if (status && status !== ticket.status) {
    const allowed = STATUS_TRANSITIONS[ticket.status] ?? []
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Cannot move ticket from ${ticket.status} to ${status}`)
    }
    ticket.status = status as never
    if (status === 'resolved') ticket.resolvedAt = new Date()
    if (status === 'closed') ticket.closedAt = new Date()
    if (status === 'open') {
      ticket.resolvedAt = null
      ticket.closedAt = null
    }
  }

  await ticket.save()
  await ticket.populate([
    { path: 'requester', select: 'name email role department avatarUrl' },
    { path: 'assignee', select: 'name email role avatarUrl' },
    { path: 'relatedAsset', select: 'assetTag deviceType brand model' },
  ])
  res.json(ticket)
})

export const reopenTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ticket = await Ticket.findById(req.params.id)
  if (!ticket) throw new ApiError(404, 'Ticket not found')

  const isOwner = String(ticket.requester) === req.user!._id
  if (!isOwner && !STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')
  if (!['resolved', 'closed'].includes(ticket.status)) {
    throw new ApiError(400, 'Only resolved or closed tickets can be reopened')
  }

  ticket.status = 'open'
  ticket.reopenCount += 1
  ticket.resolvedAt = null
  ticket.closedAt = null
  ticket.slaDueAt = slaDueFor(ticket.priority)
  await ticket.save()
  res.json(ticket)
})

export const addComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ticket = await Ticket.findById(req.params.id)
  if (!ticket) throw new ApiError(404, 'Ticket not found')

  const isStaff = STAFF_ROLES.has(req.user!.role)
  const isOwner = String(ticket.requester) === req.user!._id
  if (!isStaff && !isOwner) throw new ApiError(403, 'Forbidden')

  const { message, isInternal } = req.body as { message?: string; isInternal?: boolean }
  if (!message?.trim()) throw new ApiError(400, 'Comment message is required')

  const comment = await TicketComment.create({
    ticket: ticket._id,
    author: req.user!._id,
    message: message.trim(),
    isInternal: Boolean(isInternal) && isStaff, // only staff can post internal notes
  })

  // Keep the ticket visibly active when the requester replies.
  if (isOwner && ['pending_user'].includes(ticket.status)) {
    ticket.status = 'in_progress'
    await ticket.save()
  }

  await comment.populate('author', 'name role avatarUrl')
  res.status(201).json(comment)
})

export const uploadAttachments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ticket = await Ticket.findById(req.params.id)
  if (!ticket) throw new ApiError(404, 'Ticket not found')

  const isOwner = String(ticket.requester) === req.user!._id
  if (!isOwner && !STAFF_ROLES.has(req.user!.role)) throw new ApiError(403, 'Forbidden')

  const files = (req.files as Express.Multer.File[]) ?? []
  for (const f of files) {
    ticket.attachments.push({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      uploadedBy: req.user!._id as never,
      uploadedAt: new Date(),
    })
  }
  await ticket.save()
  res.json(ticket.attachments)
})

export const downloadAttachment = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id)
  if (!ticket) throw new ApiError(404, 'Ticket not found')
  const attachment = ticket.attachments.find((a) => a.filename === req.params.filename)
  if (!attachment) throw new ApiError(404, 'Attachment not found')
  res.download(path.resolve('uploads', attachment.filename), attachment.originalName)
})

export const ticketStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const scope: Record<string, unknown> = STAFF_ROLES.has(req.user!.role)
    ? {}
    : { requester: req.user!._id }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000)

  const [total, open, inProgress, resolvedThisWeek, overdue, byPriority, byCategory, mineOpen] =
    await Promise.all([
      Ticket.countDocuments(scope),
      Ticket.countDocuments({ ...scope, status: { $in: ['open', 'assigned', 'in_progress', 'pending_user'] } }),
      Ticket.countDocuments({ ...scope, status: 'in_progress' }),
      Ticket.countDocuments({ ...scope, status: { $in: ['resolved', 'closed'] }, updatedAt: { $gte: weekAgo } }),
      Ticket.countDocuments({ ...scope, slaDueAt: { $lt: now }, status: { $nin: ['resolved', 'closed'] } }),
      Ticket.aggregate([
        { $match: scope },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $match: scope },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments({ ...scope, requester: req.user!._id, status: { $nin: ['resolved', 'closed'] } }),
    ])

  res.json({
    total,
    open,
    inProgress,
    resolvedThisWeek,
    overdue,
    byPriority,
    byCategory,
    mineOpen,
  })
})
