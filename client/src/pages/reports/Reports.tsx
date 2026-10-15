import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '@/api/client'
import { EmptyState, Spinner } from '@/components/ui/badges'

const REPORTS = [
  { key: 'tickets-over-time', label: 'Tickets over time' },
  { key: 'by-category', label: 'By category' },
  { key: 'by-priority', label: 'By priority' },
  { key: 'resolution-times', label: 'Resolution times' },
  { key: 'top-problem-assets', label: 'Top problem assets' },
  { key: 'warranty-expiring', label: 'Warranty expiring' },
] as const

type ReportKey = (typeof REPORTS)[number]['key']

interface Summary {
  avgResolutionHours: number
  slaBreached: number
  engagement: number
  maintenanceSpend: number
}

export default function Reports() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [overTime, setOverTime] = useState<{ bucket: number; year: number; created: number; resolved: number }[]>([])
  const [byCategory, setByCategory] = useState<{ _id: string; count: number }[]>([])
  const [byPriority, setByPriority] = useState<{ _id: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<Summary>('/reports/summary'),
      api.get('/reports/tickets-over-time?days=30'),
      api.get('/reports/by-category'),
      api.get('/reports/by-priority'),
    ])
      .then(([s, ot, bc, bp]) => {
        setSummary(s.data)
        setOverTime(ot.data)
        setByCategory(bc.data)
        setByPriority(bp.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const exportCsv = useCallback(async (key: ReportKey, filename: string) => {
    const res = await api.get(`/reports/${key}?format=csv`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  if (loading) return <Spinner />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <div className="flex flex-wrap gap-2">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => void exportCsv(r.key, `${r.key}.csv`)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              ⬇ {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary tiles */}
      {summary && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{summary.avgResolutionHours}h</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Avg resolution time</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.slaBreached}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">SLA breaches (open)</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{summary.engagement}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Avg comments / ticket (30d)</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              ${summary.maintenanceSpend.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Maintenance spend</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Created vs resolved (30 days)</h2>
          {overTime.length === 0 ? (
            <EmptyState icon="📈" title="No activity yet" hint="Charts fill in as tickets come in." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#47556930" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="created" stroke="#3b82f6" fill="#3b82f640" />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="#10b98140" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">By category</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#47556930" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="_id" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">By priority</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byPriority} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#47556930" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="_id" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
