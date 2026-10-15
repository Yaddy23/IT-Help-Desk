import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { Department } from '../models/Department.js'
import { User } from '../models/User.js'
import { Asset } from '../models/Asset.js'
import { AssetAssignment } from '../models/AssetAssignment.js'
import { Ticket, slaDueFor } from '../models/Ticket.js'
import { TicketComment } from '../models/TicketComment.js'
import { KnowledgeBase } from '../models/KnowledgeBase.js'
import { Settings } from '../models/Settings.js'
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
    location: 'HQ · Floor 3',
  },
  {
    name: 'Taylor Tech',
    email: 'itstaff@demo.com',
    role: 'it_staff' as const,
    department: 'IT',
    jobTitle: 'Support Technician',
    location: 'HQ · Floor 3',
  },
  {
    name: 'Erin Employee',
    email: 'employee@demo.com',
    role: 'employee' as const,
    department: 'Finance',
    jobTitle: 'Accountant',
    location: 'HQ · Floor 1',
  },
  {
    name: 'Sam Sales',
    email: 'sales@demo.com',
    role: 'employee' as const,
    department: 'Sales',
    jobTitle: 'Account Executive',
    location: 'HQ · Floor 2',
  },
]

const ASSETS = [
  { assetTag: 'AST-0001', deviceType: 'laptop' as const, brand: 'Dell', model: 'Latitude 5540', status: 'in_stock' as const, location: 'HQ · IT storeroom', purchaseDate: '2024-01-15', warrantyExpiry: '2027-01-15', cost: 1450, serialNumber: 'DL5540-88231' },
  { assetTag: 'AST-0002', deviceType: 'monitor' as const, brand: 'LG', model: '27UP850', status: 'in_use' as const, location: 'HQ · Floor 1', purchaseDate: '2023-06-01', warrantyExpiry: '2026-08-01', cost: 380, serialNumber: 'LG27UP-51122' },
  { assetTag: 'AST-0003', deviceType: 'printer' as const, brand: 'HP', model: 'LaserJet Pro M404', status: 'in_use' as const, location: 'HQ · Floor 1 kitchen', purchaseDate: '2022-03-10', warrantyExpiry: '2026-11-01', cost: 290, serialNumber: 'HPLJ-77410' },
  { assetTag: 'AST-0004', deviceType: 'laptop' as const, brand: 'Apple', model: 'MacBook Air M2', status: 'in_stock' as const, location: 'HQ · IT storeroom', purchaseDate: '2024-09-20', warrantyExpiry: '2027-09-20', cost: 1199, serialNumber: 'MBA-M2-33119' },
  { assetTag: 'AST-0005', deviceType: 'network' as const, brand: 'Ubiquiti', model: 'UniFi Switch 24', status: 'in_use' as const, location: 'HQ · Server room', purchaseDate: '2023-01-05', warrantyExpiry: '2026-01-05', cost: 620, serialNumber: 'UBI-24-90211' },
  { assetTag: 'AST-0006', deviceType: 'desktop' as const, brand: 'HP', model: 'EliteDesk 800 G9', status: 'retired' as const, location: 'HQ · IT storeroom', purchaseDate: '2019-05-12', warrantyExpiry: '2022-05-12', cost: 980, serialNumber: 'HPED-10902' },
]

const TICKETS = [
  {
    title: 'Laptop battery drains in under an hour',
    description: 'My work laptop barely lasts an hour off the charger. It gets very hot too.',
    category: 'hardware' as const,
    priority: 'high' as const,
    requesterEmail: 'employee@demo.com',
    status: 'in_progress' as const,
    assigneeEmail: 'itstaff@demo.com',
    comment: { authorEmail: 'itstaff@demo.com', message: 'Ordering a replacement battery — spare laptop available meanwhile.' },
  },
  {
    title: 'Cannot access shared Finance drive',
    description: 'Since this morning the \\\\files\\finance share asks for credentials and then fails.',
    category: 'network' as const,
    priority: 'medium' as const,
    requesterEmail: 'employee@demo.com',
    status: 'open' as const,
  },
  {
    title: 'Printer on floor 1 jams constantly',
    description: 'The kitchen printer jams on every third page. Tray 2 seems worst.',
    category: 'printer' as const,
    priority: 'low' as const,
    requesterEmail: 'sales@demo.com',
    status: 'resolved' as const,
    assigneeEmail: 'itstaff@demo.com',
    comment: { authorEmail: 'itstaff@demo.com', message: 'Replaced the pickup roller. Should be smooth now.' },
  },
]

const KB_ARTICLES = [
  {
    title: 'How to connect to the company VPN',
    category: 'network',
    tags: ['vpn', 'remote work'],
    content:
      '## Steps\n\n1. Open **Cisco Secure Client** from the Start menu.\n2. Enter `vpn.acme-corp.com` and sign in with your company email.\n3. Approve the MFA push on your phone.\n\n## Troubleshooting\n\n- If login fails after an MFA timeout, wait one minute and retry.\n- On home networks, disable "block unknown Wi-Fi" in the client settings.',
  },
  {
    title: 'Resetting your password',
    category: 'account',
    tags: ['password', 'account'],
    content:
      'Use the **Forgot password** link on the login page, then follow the emailed link (valid 30 minutes).\n\nIf you no longer have access to your email, call the help desk at ext. 4357.',
  },
  {
    title: 'Requesting new equipment',
    category: 'hardware',
    tags: ['assets', 'equipment'],
    content:
      'Submit a ticket with category **Hardware** and priority **Low**, listing what you need and why.\n\nIT keeps a stock of laptops, monitors and peripherals in the HQ storeroom. Requests are usually fulfilled within two business days.',
  },
  {
    title: 'Setting up email on your phone',
    category: 'email',
    tags: ['email', 'mobile'],
    isPublished: true,
    content:
      '**iOS:** Settings → Mail → Accounts → Add → Microsoft Exchange.\n\n**Android:** Outlook app → Add account.\n\nUse your full company email; the server auto-detects.',
  },
]

async function seed() {
  await connectDB()
  console.log('Seeding…')

  await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})))

  const departments = (await Department.insertMany(DEPARTMENTS)) as Array<{
    _id: mongoose.Types.ObjectId
    name: string
  }>
  const deptByName = new Map<string, mongoose.Types.ObjectId>(
    departments.map((d) => [d.name, d._id]),
  )

  const passwordHash = await bcrypt.hash('Password123!', 10)
  const users = (await User.insertMany(
    USERS.map((u) => ({
      ...u,
      passwordHash, // insertMany bypasses the pre-save hook, so hash here
      notificationPrefs: { inApp: true, email: true },
    })).map((u) => ({ ...u, department: deptByName.get(u.department as string) })),
  )) as Array<{ _id: mongoose.Types.ObjectId; email: string; name: string }>
  const userByEmail = new Map(users.map((u) => [u.email, u]))

  const admin = userByEmail.get('admin@demo.com')!
  const staff = userByEmail.get('itstaff@demo.com')!
  const erin = userByEmail.get('employee@demo.com')!

  // Assets + one live assignment (Erin's monitor).
  const assets = (await Asset.insertMany(ASSETS)) as Array<{
    _id: mongoose.Types.ObjectId
    assetTag: string
    deviceType: string
  }>
  const monitor = assets.find((a) => a.assetTag === 'AST-0002')!
  await AssetAssignment.create({
    asset: monitor._id,
    employee: erin._id,
    assignedBy: admin._id,
    conditionOut: 'Good condition, HDMI cable included.',
  })
  await Asset.findByIdAndUpdate(monitor._id, { assignedTo: erin._id })

  // Tickets with SLA due dates and one comment thread.
  for (const t of TICKETS) {
    const ticket = await Ticket.create({
      ticketNumber: await nextTicketNumber(),
      requester: userByEmail.get(t.requesterEmail)!._id,
      assignee: t.assigneeEmail ? userByEmail.get(t.assigneeEmail)!._id : null,
      category: t.category,
      priority: t.priority,
      status: t.status,
      title: t.title,
      description: t.description,
      slaDueAt: slaDueFor(t.priority),
      resolvedAt: t.status === 'resolved' ? new Date() : null,
    })
    if (t.comment) {
      await TicketComment.create({
        ticket: ticket._id,
        author: userByEmail.get(t.comment.authorEmail)!._id,
        message: t.comment.message,
      })
    }
  }

  // Knowledge base with a staff author.
  await KnowledgeBase.insertMany(
    KB_ARTICLES.map((a) => ({ ...a, author: staff._id, viewCount: Math.floor(Math.random() * 80) + 5 })),
  )

  await Settings.create({ companyName: 'Acme Corp IT' })

  console.log('Seed complete:')
  console.log('  admin@demo.com / Password123! (admin)')
  console.log('  itstaff@demo.com / Password123! (it staff)')
  console.log('  employee@demo.com / Password123! (employee)')
  console.log('  sales@demo.com / Password123! (employee)')

  await mongoose.disconnect()
}

let counter = 0
async function nextTicketNumber(): Promise<string> {
  counter += 1
  return `TCK-${new Date().getFullYear()}-${String(counter).padStart(4, '0')}`
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
