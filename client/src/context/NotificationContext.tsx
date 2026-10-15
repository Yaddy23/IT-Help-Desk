import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import api from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import type { AppNotification, PageMeta } from '@/types'

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  meta: PageMeta | null
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  loadMore: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const pageRef = useRef(1)

  const refreshUnread = useCallback(async () => {
    try {
      const { data } = await api.get<{ count: number }>('/notifications/unread-count')
      setUnreadCount(data.count)
    } catch {
      // signed out or network blip — badge just stays as-is
    }
  }, [])

  const fetchPage = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const { data } = await api.get<{ notifications: AppNotification[]; meta: PageMeta }>(
        `/notifications?page=${page}&limit=15`,
      )
      setNotifications((prev) => (page === 1 ? data.notifications : [...prev, ...data.notifications]))
      setMeta(data.meta)
      pageRef.current = page
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setMeta(null)
      return
    }
    void fetchPage(1)
    void refreshUnread()
    // Poll so the badge stays fresh without a websocket layer.
    const interval = setInterval(refreshUnread, 30_000)
    return () => clearInterval(interval)
  }, [user, fetchPage, refreshUnread])

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id && !n.isRead ? { ...n, isRead: true } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
      try {
        await api.patch(`/notifications/${id}/read`)
      } catch {
        void refreshUnread()
      }
    },
    [refreshUnread],
  )

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    try {
      await api.patch('/notifications/read-all')
    } catch {
      void refreshUnread()
    }
  }, [refreshUnread])

  const loadMore = useCallback(async () => {
    if (meta && pageRef.current < meta.totalPages) {
      await fetchPage(pageRef.current + 1)
    }
  }, [meta, fetchPage])

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, meta, markRead, markAllRead, loadMore }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}
