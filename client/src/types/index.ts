export type Role = 'admin' | 'it_staff' | 'employee'

export interface User {
  _id: string
  name: string
  email: string
  role: Role
  department?: { _id: string; name: string } | null
  phone?: string
  jobTitle?: string
  location?: string
  avatarUrl?: string
  isActive: boolean
  notificationPrefs: { inApp: boolean; email: boolean }
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
  accessToken: string
}

export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'pending_user' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketCategory = 'hardware' | 'software' | 'network' | 'account' | 'email' | 'printer' | 'other'

export interface Ticket {
  _id: string
  ticketNumber: string
  requester: Pick<User, '_id' | 'name' | 'email' | 'role'> | string
  assignee: Pick<User, '_id' | 'name' | 'role'> | null
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  title: string
  description: string
  relatedAsset: { _id: string; assetTag: string; deviceType: string; brand?: string; model?: string } | null
  slaDueAt: string
  resolvedAt: string | null
  closedAt: string | null
  reopenCount: number
  attachments: TicketAttachment[]
  createdAt: string
  updatedAt: string
}

export interface TicketAttachment {
  filename: string
  originalName: string
  mimetype: string
  size: number
  uploadedAt: string
}

export interface TicketComment {
  _id: string
  ticket: string
  author: Pick<User, '_id' | 'name' | 'role'> | string
  message: string
  isInternal: boolean
  createdAt: string
}

export interface PageMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TicketStats {
  total: number
  open: number
  inProgress: number
  resolvedThisWeek: number
  overdue: number
  mineOpen: number
  byPriority: { _id: TicketPriority; count: number }[]
  byCategory: { _id: TicketCategory; count: number }[]
}
