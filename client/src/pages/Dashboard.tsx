import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import type { AssetStats, TicketStats } from '@/types'

const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
}

function StatTile({ label, value, accent, to }: { label: string; value: number | string; accent: string; to: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
    >
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [assetStats, setAssetStats] = useState<AssetStats | null>(null)

  useEffect(() => {
    api.get<TicketStats>('/tickets/stats').then(({ data }) => setTicketStats(data)).catch(() => {})
    if (user?.role !== 'employee') {
      api.get<AssetStats>('/assets/stats').then(({ data }) => setAssetStats(data)).catch(() => {})
    }
  }, [user?.role])

  const firstName = user?.name.split(' ')[0]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Welcome back, {firstName} 👋
      </h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        {user?.role === 'employee'
          ? 'Track your requests and equipment below.'
          : "Here's what's happening in IT today."}
      </p>

      {/* Stat tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ticketStats && (
          <>
            {user?.role !== 'employee' && (
              <StatTile label="Total tickets" value={ticketStats.total} accent="text-slate-900 dark:text-white" to="/tickets" />
            )}
            <StatTile
              label={user?.role === 'employee' ? 'My open tickets' : 'Open tickets'}
              value={user?.role === 'employee' ? ticketStats.mineOpen : ticketStats.open}
              accent="text-blue-600 dark:text-blue-400"
              to="/tickets"
            />
            <StatTile label="Resolved this week" value={ticketStats.resolvedThisWeek} accent="text-emerald-600 dark:text-emerald-400" to="/tickets" />
            <StatTile label="Overdue (SLA breached)" value={ticketStats.overdue} accent="text-red-600 dark:text-red-400" to="/tickets?overdue=true" />
          </>
        )}
        {user?.role !== 'employee' && assetStats && (
          <StatTile label="Warranty expiring (90d)" value={assetStats.warrantyExpiring} accent="text-amber-600 dark:text-amber-400" to="/assets" />
        )}
      </div>

      {/* Charts — staff only */}
      {user?.role !== 'employee' && ticketStats && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Tickets by priority</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ticketStats.byPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="#47556930" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {ticketStats.byPriority.map((entry) => (
                    <Cell key={entry._id} fill={PRIORITY_COLORS[entry._id] ?? '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Tickets by category</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={ticketStats.byCategory}
                  dataKey="count"
                  nameKey="_id"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {ticketStats.byCategory.map((entry) => (
                    <Cell key={entry._id} fill={`hsl(${(entry._id.length * 47) % 360} 65% 55%)`} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Employee quick actions */}
      {user?.role === 'employee' && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/tickets/new"
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            + Report a problem
          </Link>
          <Link
            to="/assets"
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            My equipment
          </Link>
        </div>
      )}
    </div>
  )
}
