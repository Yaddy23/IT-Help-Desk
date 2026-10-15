import mongoose, { Schema } from 'mongoose'

export interface ISettings {
  companyName: string
  slaHours: { low: number; medium: number; high: number; critical: number }
  ticketCategories: string[]
  deviceTypes: string[]
  emailNotificationsEnabled: boolean
  updatedAt: Date
}

const settingsSchema = new Schema<ISettings>(
  {
    companyName: { type: String, default: 'Acme Corp IT' },
    slaHours: {
      low: { type: Number, default: 72 },
      medium: { type: Number, default: 48 },
      high: { type: Number, default: 24 },
      critical: { type: Number, default: 4 },
    },
    ticketCategories: {
      type: [String],
      default: ['hardware', 'software', 'network', 'account', 'email', 'printer', 'other'],
    },
    deviceTypes: {
      type: [String],
      default: ['laptop', 'desktop', 'monitor', 'printer', 'phone', 'network', 'peripheral', 'other'],
    },
    emailNotificationsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema)
