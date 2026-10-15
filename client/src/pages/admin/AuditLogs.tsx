import { useCallback, useEffect, useState } from 'react'
import api from '@/api/client'
import { EmptyState, Spinner } from '@/components/ui/badges'
import type { PageMeta } from '@/types'

interface AuditLog {
  _id: string
  actor: { _id: string; name: string } | string | null
  action: string
  targetType: string
  targetId: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip?: string
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  'ticket.created': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'ticket.updated': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  'asset.created': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'asset.assigned': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'asset.returned': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  'user.created': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  'user.updated': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (action) params.set('action', action)
      params.set('page', String(page))
      const { data } = await api.get<{ logs: AuditLog[]; meta: PageMeta }>(`/audit-logs?${params}`)
      setLogs(data.logs)
      setMeta(data.meta)
    } finally {
      setLoading(false)
    }
  }, [action, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>

      <div className="mt-4">
        <input
          type="search"
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setPage(1)
          }}
          placeholder="Filter by action (e.g. ticket.updated)…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-80 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : logs.length === 0 ? (
        <EmptyState icon="🗒️" title="No audit entries" hint="Actions appear here as staff work." />
      ) : (
        <div className="mt-4 space-y-2">
          {logs.map((log) => (
            <div key={log._id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 font-mono text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {log.action}
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {typeof log.actor === 'object' && log.actor ? log.actor.name : 'System'}
                </span>
                <span className="text-xs text-slate-400">
                  {log.targetType}{log.targetId ? ` · ${log.targetId.slice(-6)}` : ''}
                </span>
                <span className="ml-auto text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              {(log.before || log.after) && (
                <p className="mt-1 truncate font-mono text-xs text-slate-400">
                  {log.before ? JSON.stringify(log.before) : '∅'} → {log.after ? JSON.stringify(log.after) : '∅'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>Page {meta.page} of {meta.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">
              ← Prev
            </button>
            <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
