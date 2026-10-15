import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/api/client'
import type { Ticket, TicketCategory, TicketPriority } from '@/types'

const CATEGORIES: { value: TicketCategory; label: string; icon: string }[] = [
  { value: 'hardware', label: 'Hardware', icon: '🖥️' },
  { value: 'software', label: 'Software', icon: '💿' },
  { value: 'network', label: 'Network / Wi-Fi', icon: '📡' },
  { value: 'account', label: 'Account / Access', icon: '🔑' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'printer', label: 'Printer', icon: '🖨️' },
  { value: 'other', label: 'Something else', icon: '📦' },
]

const PRIORITIES: { value: TicketPriority; label: string; hint: string }[] = [
  { value: 'low', label: 'Low', hint: 'Nice to have — 3 days' },
  { value: 'medium', label: 'Medium', hint: 'Affects my work — 2 days' },
  { value: 'high', label: 'High', hint: 'Cannot work — 1 day' },
  { value: 'critical', label: 'Critical', hint: 'Everything is down — 4 hours' },
]

export default function NewTicket() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('other')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { data } = await api.post<Ticket>('/tickets', { title, description, category, priority })
      navigate(`/tickets/${data._id}`)
    } catch {
      setError('Could not submit the ticket — please try again')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New ticket</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Describe the problem and the IT team will pick it up.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Subject
          </label>
          <input
            id="title"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Laptop won't connect to Wi-Fi"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">What is it about?</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  category === c.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className="mr-1">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">How urgent is it?</span>
          <div className="grid gap-2 sm:grid-cols-4">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  priority === p.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{p.label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{p.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Description
          </label>
          <textarea
            id="description"
            required
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened? When did it start? What have you already tried?"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit ticket'}
        </button>
      </form>
    </div>
  )
}
