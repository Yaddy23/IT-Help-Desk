import mongoose, { Schema } from 'mongoose'

export interface IAuditLog {
  _id: mongoose.Types.ObjectId
  actor: mongoose.Types.ObjectId | null
  action: string
  targetType: string
  targetId: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip?: string
  createdAt: Date
}

const auditSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, default: null },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

auditSchema.index({ createdAt: -1 })

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditSchema)
