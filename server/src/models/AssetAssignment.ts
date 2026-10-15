import mongoose, { Schema } from 'mongoose'

export interface IAssetAssignment {
  _id: mongoose.Types.ObjectId
  asset: mongoose.Types.ObjectId
  employee: mongoose.Types.ObjectId
  assignedBy: mongoose.Types.ObjectId
  assignedAt: Date
  returnedAt: Date | null
  conditionOut?: string
  conditionIn?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const assignmentSchema = new Schema<IAssetAssignment>(
  {
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date, default: null },
    conditionOut: { type: String, trim: true },
    conditionIn: { type: String, trim: true },
    notes: { type: String },
  },
  { timestamps: true },
)

// One active assignment per asset
assignmentSchema.index({ asset: 1, returnedAt: 1 }, { unique: true, partialFilterExpression: { returnedAt: null } })

export const AssetAssignment = mongoose.model<IAssetAssignment>('AssetAssignment', assignmentSchema)

export interface IMaintenanceRecord {
  _id: mongoose.Types.ObjectId
  asset: mongoose.Types.ObjectId
  type: 'repair' | 'upgrade' | 'inspection' | 'replacement'
  description: string
  performedBy?: string
  cost?: number
  downtimeHours?: number
  relatedTicket: mongoose.Types.ObjectId | null
  date: Date
  createdAt: Date
  updatedAt: Date
}

const maintenanceSchema = new Schema<IMaintenanceRecord>(
  {
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    type: { type: String, enum: ['repair', 'upgrade', 'inspection', 'replacement'], required: true },
    description: { type: String, required: true },
    performedBy: { type: String, trim: true },
    cost: { type: Number, min: 0 },
    downtimeHours: { type: Number, min: 0 },
    relatedTicket: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export const MaintenanceRecord = mongoose.model<IMaintenanceRecord>('MaintenanceRecord', maintenanceSchema)
