import mongoose, { Schema } from 'mongoose'

export interface IDepartment {
  _id: mongoose.Types.ObjectId
  name: string
  description?: string
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
)

export const Department = mongoose.model<IDepartment>('Department', departmentSchema)
