import mongoose, { Schema } from 'mongoose'

export type DeviceType =
  | 'laptop'
  | 'desktop'
  | 'monitor'
  | 'printer'
  | 'phone'
  | 'network'
  | 'peripheral'
  | 'other'

export type AssetStatus = 'in_stock' | 'in_use' | 'in_repair' | 'retired'

export interface IAsset {
  _id: mongoose.Types.ObjectId
  assetTag: string
  serialNumber?: string
  deviceType: DeviceType
  brand?: string
  model?: string
  status: AssetStatus
  location?: string
  purchaseDate?: Date
  warrantyExpiry?: Date
  cost?: number
  notes?: string
  assignedTo: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const assetSchema = new Schema<IAsset>(
  {
    assetTag: { type: String, required: true, unique: true, uppercase: true, trim: true },
    serialNumber: { type: String, trim: true },
    deviceType: {
      type: String,
      enum: ['laptop', 'desktop', 'monitor', 'printer', 'phone', 'network', 'peripheral', 'other'],
      required: true,
    },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    status: {
      type: String,
      enum: ['in_stock', 'in_use', 'in_repair', 'retired'],
      default: 'in_stock',
      index: true,
    },
    location: { type: String, trim: true },
    purchaseDate: { type: Date },
    warrantyExpiry: { type: Date },
    cost: { type: Number, min: 0 },
    notes: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true },
)

export const Asset = mongoose.model<IAsset>('Asset', assetSchema)
