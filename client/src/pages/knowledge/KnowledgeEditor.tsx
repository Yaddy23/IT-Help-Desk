import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/api/client'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white'
const labelCls = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300'

export default function KnowledgeEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    category: 'general',
    content: '',
    tags: '',
    isPublished: true,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .get<{ title: string; category: string; content: string; tags: string[]; isPublished: boolean }>(`/knowledge/${id}`)
      .then(({ data }) =>
        setForm({
          title: data.title,
          category: data.category,
          content: data.content,
          tags: data.tags.join(', '),
          isPublished: data.isPublished,
        }),
      )
      .catch(() => setError('Failed to load article'))
  }, [id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const body = {
      title: form.title,
      category: form.category,
      content: form.content,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      isPublished: form.isPublished,
    }
    try {
      const { data } = id
        ? await api.patch<{ _id: string }>(`/knowledge/${id}`, body)
        : await api.post<{ _id: string }>('/knowledge', body)
      navigate(`/knowledge/${data._id}`)
    } catch {
      setError('Could not save the article')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {id ? 'Edit article' : 'New article'}
      </h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div>
          <label htmlFor="title" className={labelCls}>Title *</label>
          <input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className={labelCls}>Category</label>
            <input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label htmlFor="tags" className={labelCls}>Tags (comma-separated)</label>
            <input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vpn, remote work" className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="content" className={labelCls}>Content * (markdown-ish: ## heading, **bold**, - list)</label>
          <textarea id="content" required rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={`${inputCls} font-mono`} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
          Published (uncheck to keep as draft)
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save article'}
        </button>
      </form>
    </div>
  )
}
