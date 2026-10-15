import mongoose, { Schema } from 'mongoose'
import type { IAttachment } from './Ticket.js'

export interface ITicketComment {
  _id: mongoose.Types.ObjectId
  ticket: mongoose.Types.ObjectId
  author: mongoose.Types.ObjectId
  message: string
  isInternal: boolean
  attachments: IAttachment[]
  createdAt: Date
  updatedAt: Date
}

const commentSchema = new Schema<ITicketComment>(
  {
    ticket: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
    attachments: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true },
)

export const TicketComment = mongoose.model<ITicketComment>('TicketComment', commentSchema)

export type { IAttachment }
