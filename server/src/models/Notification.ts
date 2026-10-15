import mongoose, { Schema } from 'mongoose'

export type NotificationType =
  | 'ticket_assigned'
  | 'ticket_updated'
  | 'ticket_commented'
  | 'ticket_resolved'
  | 'assignment_created'
  | 'system'

export interface INotification {
  _id: mongoose.Types.ObjectId
  recipient: mongoose.Types.ObjectId
  type: NotificationType
  title: string
  message: string
  link?: string
  isRead: boolean
  readAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['ticket_assigned', 'ticket_updated', 'ticket_commented', 'ticket_resolved', 'assignment_created', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
)

// Unread badge queries hit recipient + isRead constantly.
notificationSchema.index({ recipient: 1, isRead: 1 })

export const Notification = mongoose.model<INotification>('Notification', notificationSchema)
