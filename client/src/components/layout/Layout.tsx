import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import type { Role } from '@/types'

interface NavItem {
  to: string
  label: string
  icon: string
  roles?: Role[]
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/tickets', label: 'Tickets', icon: '🎫' },
  { to: '/assets', label: 'Assets', icon: '💻' },
  { to: '/employees', label: 'Employees', icon: '👥' },
  { to: '/knowledge', label: 'Knowledge Base', icon: '📚' },
  { to: '/reports', label: 'Reports', icon: '📈', roles: ['admin', 'it_staff'] },
  { to: '/audit-logs', label: 'Audit Logs', icon: '🗒️', roles: ['admin'] },
  { to: '/settings', label: 'Settings', icon: '⚙️', roles: ['admin'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  if (!user) return null

  const items = NAV.filter((item) => !item.roles || item.roles.includes(user.role))

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
          <span className="text-2xl">🛠️</span>
          <span className="font-semibold text-slate-900 dark:text-white">HelpDesk</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user.role.replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ⏻ Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <span className="text-xl">🛠️</span>
            <span className="font-semibold text-slate-900 dark:text-white">HelpDesk</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="rounded-lg p-2 text-lg hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
              aria-label="Sign out"
            >
              ⏻
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
