import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '@/api/client'
import { Spinner } from '@/components/ui/badges'
import { useAuth } from '@/context/AuthContext'
import type { KbArticle } from '@/pages/knowledge/KnowledgeList'

/** Very small markdown-ish renderer: headings, bold, lists, paragraphs. */
function renderContent(content: string) {
  return content.split(/\n{2,}/).map((block, i) => {
    const lines = block.split('\n')
    if (lines.every((l) => l.trim().startsWith('-') || l.trim().startsWith('*'))) {
      return (
        <ul key={i} className="my-3 list-disc space-y-1 pl-6">
          {lines.map((l, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inline(l.replace(/^\s*[-*]\s*/, '')) }} />
          ))}
        </ul>
      )
    }
    if (block.startsWith('### ')) {
      return <h3 key={i} className="mt-4 font-semibold text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: inline(block.slice(4)) }} />
    }
    if (block.startsWith('## ')) {
      return <h2 key={i} className="mt-5 text-lg font-semibold text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: inline(block.slice(3)) }} />
    }
    return <p key={i} className="my-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(block) }} />
  })
}

// Content is authored by IT staff only, so limited inline HTML is acceptable.
function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-slate-100 px-1 text-[13px] dark:bg-slate-800">$1</code>')
}

export default function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [article, setArticle] = useState<KbArticle | null>(null)
  const [error, setError] = useState('')
  const [voted, setVoted] = useState(false)

  const isStaff = user?.role !== 'employee'

  useEffect(() => {
    api
      .get<KbArticle>(`/knowledge/${id}`)
      .then(({ data }) => setArticle(data))
      .catch(() => setError('Article not found'))
  }, [id])

  async function vote(helpful: boolean) {
    if (voted) return
    setVoted(true)
    try {
      const { data } = await api.post<{ helpfulYes: number; helpfulNo: number }>(`/knowledge/${id}/vote`, { helpful })
      setArticle((a) => (a ? { ...a, ...data } : a))
    } catch {
      setVoted(false)
    }
  }

  async function remove() {
    if (!confirm('Delete this article?')) return
    await api.delete(`/knowledge/${id}`)
    navigate('/knowledge')
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-red-700 dark:bg-red-950/50 dark:text-red-300">
        {error} · <Link to="/knowledge" className="underline">back to knowledge base</Link>
      </div>
    )
  }
  if (!article) return <Spinner />

  const authorName = typeof article.author === 'string' ? '—' : article.author?.name

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/knowledge" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Knowledge Base
      </Link>

      <article className="mt-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {article.category}
          </span>
          <span className="text-xs text-slate-400">
            {article.viewCount} views · 👍 {article.helpfulYes} / 👎 {article.helpfulNo}
          </span>
          {isStaff && (
            <span className="ml-auto flex gap-2">
              <button
                onClick={() => navigate(`/knowledge/${article._id}/edit`)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs dark:border-slate-700"
              >
                Edit
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => void remove()}
                  className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600 dark:border-red-800 dark:text-red-400"
                >
                  Delete
                </button>
              )}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{article.title}</h1>
        <p className="mt-1 text-xs text-slate-400">
          By {authorName} · {new Date(article.createdAt).toLocaleDateString()}
        </p>

        <div className="mt-4 text-[15px] text-slate-700 dark:text-slate-300">
          {renderContent(article.content)}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Was this helpful?</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => void vote(true)}
              disabled={voted}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              👍 Yes
            </button>
            <button
              onClick={() => void vote(false)}
              disabled={voted}
              className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              👎 No
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}
