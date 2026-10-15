import mongoose, { Schema } from 'mongoose'
import type { IUser } from './User.js'

export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'pending_user' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketCategory =
  | 'hardware'
  | 'software'
  | 'network'
  | 'account'
  | 'email'
  | 'printer'
  | 'other'

export interface IAttachment {
  filename: string
  originalName: string
  mimetype: string
  size: number
  uploadedBy: mongoose.Types.ObjectId
  uploadedAt: Date
}

export interface ITicket {
  _id: mongoose.Types.ObjectId
  ticketNumber: string
  requester: mongoose.Types.ObjectId | IUser
  assignee: mongoose.Types.ObjectId | IUser | null
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  title: string
  description: string
  relatedAsset: mongoose.Types.ObjectId | null
  slaDueAt: Date
  resolvedAt: Date | null
  closedAt: Date | null
  reopenCount: number
  attachments: IAttachment[]
  createdAt: Date
  updatedAt: Date
}

const SLA_HOURS: Record<TicketPriority, number> = {
  low: 72,
  medium: 48,
  high: 24,
  critical: 4,
}

export function slaDueFor(priority: TicketPriority, from: Date = new Date()): Date {
  return new Date(from.getTime() + SLA_HOURS[priority] * 3600_000)
}

const attachmentSchema = new Schema<IAttachment>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, unique: true },
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    category: {
      type: String,
      enum: ['hardware', 'software', 'network', 'account', 'email', 'printer', 'other'],
      default: 'other',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'pending_user', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    relatedAsset: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
    slaDueAt: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    reopenCount: { type: Number, default: 0 },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true },
)

ticketSchema.index({ status: 1, priority: 1 })

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema)
