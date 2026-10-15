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
