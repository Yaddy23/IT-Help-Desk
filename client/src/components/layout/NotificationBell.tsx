import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/context/NotificationContext'

const TYPE_ICONS: Record<string, string> = {
  ticket_assigned: '👤',
  ticket_updated: '🔄',
  ticket_commented: '💬',
  ticket_resolved: '✅',
  assignment_created: '💻',
  system: '📢',
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, loadMore, meta } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close the dropdown when clicking anywhere else.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function handleItemClick(n: { _id: string; isRead: boolean; link?: string }) {
    if (!n.isRead) void markRead(n._id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => void markAllRead()}
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Nothing yet — you're all caught up.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                    n.isRead ? '' : 'bg-blue-50/60 dark:bg-blue-950/30'
                  }`}
                >
                  <span className="text-lg">{TYPE_ICONS[n.type] ?? '📢'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                      {n.title}
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {n.message}
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </span>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                </button>
              ))
            )}
          </div>

          {meta && meta.page < meta.totalPages && (
            <button
              onClick={() => void loadMore()}
              className="w-full border-t border-slate-200 py-2 text-xs text-blue-600 hover:bg-slate-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
