import { useAuth } from '@/context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Welcome back, {user?.name.split(' ')[0]} 👋
      </h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400">
        Dashboard widgets arrive in Phase 5 — tickets, assets and reports are coming next.
      </p>
    </div>
  )
}
