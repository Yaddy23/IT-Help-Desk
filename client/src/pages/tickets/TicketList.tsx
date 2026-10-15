import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDebouncedCallback } from 'use-debounce'
import api from '@/api/client'
import { EmptyState, PriorityBadge, Spinner, StatusBadge } from '@/components/ui/badges'
import { useAuth } from '@/context/AuthContext'
import type { PageMeta, Ticket, TicketCategory, TicketPriority, TicketStatus } from '@/types'

const STATUSES: TicketStatus[] = ['open', 'assigned', 'in_progress', 'pending_user', 'resolved', 'closed']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'critical']
const CATEGORIES: TicketCategory[] = ['hardware', 'software', 'network', 'account', 'email', 'printer', 'other']

function isOverdue(t: Ticket) {
  return new Date(t.slaDueAt) < new Date() && !['resolved', 'closed'].includes(t.status)
}

export default function TicketList() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [category, setCategory] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [page, setPage] = useState(1)

  const fetchTickets = async (opts: {
    search?: string
    status?: string
    priority?: string
    category?: string
    overdue?: boolean
    page?: number
  }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (opts.search) params.set('search', opts.search)
      if (opts.status) params.set('status', opts.status)
      if (opts.priority) params.set('priority', opts.priority)
      if (opts.category) params.set('category', opts.category)
      if (opts.overdue) params.set('overdue', 'true')
      params.set('page', String(opts.page ?? 1))
      const { data } = await api.get<{ tickets: Ticket[]; meta: PageMeta }>(`/tickets?${params}`)
      setTickets(data.tickets)
      setMeta(data.meta)
    } finally {
      setLoading(false)
    }
  }

  const debouncedFetch = useDebouncedCallback((s: string) => {
    setPage(1)
    fetchTickets({ search: s, status, priority, category, overdue: overdueOnly, page: 1 })
  }, 400)

  useEffect(() => {
    fetchTickets({ search, status, priority, category, overdue: overdueOnly, page })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority, category, overdueOnly, page])

  const isStaff = user?.role !== 'employee'

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tickets</h1>
        <Link
          to="/tickets/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Ticket
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search title, description, #number…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            debouncedFetch(e.target.value)
          }}
          className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked)
              setPage(1)
            }}
          />
          Overdue only
        </label>
      </div>

      {loading ? (
        <Spinner />
      ) : tickets.length === 0 ? (
        <EmptyState icon="🎫" title="No tickets found" hint="Try changing the filters or create a new ticket." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                {isStaff && <th className="px-4 py-3">Requester</th>}
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t._id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
                >
                  <td className="px-4 py-3">
                    <Link to={`/tickets/${t._id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                      {t.ticketNumber}
                    </Link>
                    <p className="max-w-xs truncate text-slate-700 dark:text-slate-300">{t.title}</p>
                    {isOverdue(t) && (
                      <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                        ⏰ Overdue
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  {isStaff && (
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {typeof t.requester === 'string' ? '—' : t.requester.name}
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {t.assignee && typeof t.assignee !== 'string' ? t.assignee.name : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} tickets
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700"
            >
              ← Prev
            </button>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
