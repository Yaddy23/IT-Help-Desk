import bcrypt from 'bcryptjs'
import mongoose, { Schema } from 'mongoose'
import type { IDepartment } from './Department.js'

export type Role = 'admin' | 'it_staff' | 'employee'

export interface IUser {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  passwordHash: string
  role: Role
  department?: IDepartment | null
  phone?: string
  jobTitle?: string
  location?: string
  avatarUrl?: string
  isActive: boolean
  notificationPrefs: { inApp: boolean; email: boolean }
  resetPasswordToken?: string | null
  resetPasswordExpires?: Date | null
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'it_staff', 'employee'], default: 'employee' },
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    phone: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    location: { type: String, trim: true },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    notificationPrefs: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
    },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true },
)

userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  delete obj.resetPasswordToken
  delete obj.resetPasswordExpires
  return obj
}

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10)
})

export const User = mongoose.model<IUser>('User', userSchema)
