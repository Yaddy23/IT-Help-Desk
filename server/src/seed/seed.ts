import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { Department } from '../models/Department.js'
import { User } from '../models/User.js'
import { env } from '../config/env.js'

const DEPARTMENTS = [
  { name: 'IT', description: 'Information Technology' },
  { name: 'Finance', description: 'Accounting and payroll' },
  { name: 'Human Resources', description: 'People operations' },
  { name: 'Sales', description: 'Sales and business development' },
  { name: 'Operations', description: 'Facilities and logistics' },
]

const USERS = [
  {
    name: 'Alex Admin',
    email: 'admin@demo.com',
    role: 'admin' as const,
    department: 'IT',
    jobTitle: 'IT Manager',
    location: 'HQ Â· Floor 3',
  },
  {
    name: 'Taylor Tech',
    email: 'itstaff@demo.com',
    role: 'it_staff' as const,
    department: 'IT',
    jobTitle: 'Support Technician',
    location: 'HQ Â· Floor 3',
  },
  {
    name: 'Erin Employee',
    email: 'employee@demo.com',
    role: 'employee' as const,
    department: 'Finance',
    jobTitle: 'Accountant',
    location: 'HQ Â· Floor 1',
  },
]

async function seed() {
  await connectDB()
  console.log('Seedingâ€¦')

  await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})))

  const departments = (await Department.insertMany(DEPARTMENTS)) as Array<{
    _id: mongoose.Types.ObjectId
    name: string
  }>
  const deptByName = new Map<string, mongoose.Types.ObjectId>(
    departments.map((d) => [d.name, d._id]),
  )

  const passwordHash = await bcrypt.hash('Password123!', 10)
  await User.insertMany(
    USERS.map((u) => ({
      ...u,
      passwordHash, // insertMany bypasses the pre-save hook, so hash here
      notificationPrefs: { inApp: true, email: true },
    })).map((u) => ({ ...u, department: deptByName.get(u.department as string) })),
  )

  console.log('Seed complete:')
  console.log('  admin@demo.com / Password123! (admin)')
  console.log('  itstaff@demo.com / Password123! (it staff)')
  console.log('  employee@demo.com / Password123! (employee)')

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
