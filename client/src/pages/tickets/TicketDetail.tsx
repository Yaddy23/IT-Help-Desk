import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '@/api/client'
import { PriorityBadge, Spinner, StatusBadge } from '@/components/ui/badges'
import { useAuth } from '@/context/AuthContext'
import type { Ticket, TicketPriority, TicketStatus, TicketComment, User } from '@/types'

const STATUSES: TicketStatus[] = ['open', 'assigned', 'in_progress', 'pending_user', 'resolved', 'closed']
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'critical']

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleString() : '—'
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [staff, setStaff] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [fileInput, setFileInput] = useState<FileList | null>(null)
  const commentEndRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!id) return
    const { data } = await api.get<{ ticket: Ticket; comments: TicketComment[] }>(`/tickets/${id}`)
    setTicket(data.ticket)
    setComments(data.comments)
  }, [id])

  useEffect(() => {
    load()
      .catch(() => setError('Failed to load ticket'))
      .finally(() => setLoading(false))
  }, [load])

  useEffect(() => {
    if (user?.role !== 'employee') {
      api
        .get<User[]>('/users', { params: { limit: 100 } })
        .then(({ data }) =>
          setStaff((Array.isArray(data) ? data : (data as { users: User[] }).users).filter((u) => u.role !== 'employee')),
        )
        .catch(() => setStaff([]))
    }
  }, [user?.role])

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  if (loading) return <Spinner />
  if (error || !ticket) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-red-700 dark:bg-red-950/50 dark:text-red-300">
        {error || 'Ticket not found'} · <Link to="/tickets" className="underline">back to tickets</Link>
      </div>
    )
  }

  const isStaff = user?.role !== 'employee'
  const isOwner = typeof ticket.requester !== 'string' && ticket.requester._id === user?._id
  const canReopen = ['resolved', 'closed'].includes(ticket.status) && (isStaff || isOwner)
  const overdue = new Date(ticket.slaDueAt) < new Date() && !['resolved', 'closed'].includes(ticket.status)

  async function patchTicket(body: Record<string, unknown>) {
    setError('')
    try {
      const { data } = await api.patch<{ ticket: Ticket }>(`/tickets/${id}`, body)
      setTicket(data.ticket ?? data)
    } catch (e) {
      setError(e instanceof Error ? 'Update failed' : 'Update failed')
    }
  }

  async function postComment(e: FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    try {
      const { data } = await api.post<TicketComment>(`/tickets/${id}/comments`, {
        message,
        isInternal,
      })
      setComments((prev) => [...prev, data])
      setMessage('')
      setIsInternal(false)
    } catch {
      setError('Failed to post comment')
    }
  }

  async function uploadFiles() {
    if (!fileInput?.length) return
    const fd = new FormData()
    Array.from(fileInput).forEach((f) => fd.append('files', f))
    try {
      const { data } = await api.post<Ticket['attachments']>(`/tickets/${id}/attachments`, fd)
      setTicket((t) => (t ? { ...t, attachments: data } : t))
      setFileInput(null)
    } catch {
      setError('Upload failed — check file type/size')
    }
  }

  async function reopen() {
    try {
      const { data } = await api.post<Ticket>(`/tickets/${id}/reopen`)
      setTicket(data)
    } catch {
      setError('Reopen failed')
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/tickets" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← All tickets
      </Link>

      {/* Header card */}
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{ticket.ticketNumber}</p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{ticket.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {overdue && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                ⏰ SLA overdue
              </span>
            )}
          </div>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{ticket.description}</p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Requester</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">
              {typeof ticket.requester === 'string' ? '—' : ticket.requester.name}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Category</dt>
            <dd className="font-medium capitalize text-slate-800 dark:text-slate-200">{ticket.category}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">SLA due</dt>
            <dd className={`font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
              {fmt(ticket.slaDueAt)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Created</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{fmt(ticket.createdAt)}</dd>
          </div>
        </dl>

        {ticket.attachments.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-900">
            <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Attachments</p>
            <ul className="flex flex-wrap gap-2">
              {ticket.attachments.map((a) => (
                <li key={a.filename}>
                  <a
                    href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:5001/api'}/tickets/${ticket._id}/attachments/${a.filename}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    📎 {a.originalName} ({Math.round(a.size / 1024)} KB)
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Staff controls */}
      {isStaff && (
        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500 dark:text-slate-400">Assignee</span>
            <select
              value={typeof ticket.assignee === 'object' && ticket.assignee ? ticket.assignee._id : ''}
              onChange={(e) => patchTicket({ assignee: e.target.value || null })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500 dark:text-slate-400">Status</span>
            <select
              value={ticket.status}
              onChange={(e) => patchTicket({ status: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500 dark:text-slate-400">Priority</span>
            <select
              value={ticket.priority}
              onChange={(e) => patchTicket({ priority: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {canReopen && (
        <button
          onClick={reopen}
          className="mt-4 rounded-lg border border-amber-400 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
        >
          ↩ Reopen ticket
        </button>
      )}

      {/* Comments */}
      <h2 className="mt-6 mb-3 font-semibold text-slate-900 dark:text-white">
        Activity ({comments.length})
      </h2>
      <div className="space-y-3">
        {comments.map((c) => {
          const author = typeof c.author === 'string' ? null : c.author
          return (
            <div
              key={c._id}
              className={`rounded-xl border p-4 ${
                c.isInternal
                  ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {author?.name ?? 'User'}
                  {author && <span className="ml-2 text-xs text-slate-500">{author.role.replace('_', ' ')}</span>}
                </span>
                <span className="text-xs text-slate-500">{fmt(c.createdAt)}</span>
              </div>
              {c.isInternal && (
                <span className="mt-1 inline-block rounded bg-amber-200 px-1.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                  Internal note — not visible to requester
                </span>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{c.message}</p>
            </div>
          )
        })}
      </div>
      <div ref={commentEndRef} />

      {/* Add comment */}
      <form onSubmit={postComment} className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Write a comment…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Comment
          </button>
          {isStaff && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Internal note
            </label>
          )}
          <input
            type="file"
            multiple
            onChange={(e) => setFileInput(e.target.files)}
            className="text-sm text-slate-500 dark:text-slate-400"
          />
          {fileInput?.length ? (
            <button
              type="button"
              onClick={uploadFiles}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Upload {fileInput.length} file(s)
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
