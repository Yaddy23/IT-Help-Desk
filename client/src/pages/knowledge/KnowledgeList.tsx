import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/api/client'
import { EmptyState, Spinner } from '@/components/ui/badges'
import { useAuth } from '@/context/AuthContext'
import type { PageMeta } from '@/types'

export interface KbArticle {
  _id: string
  title: string
  slug: string
  category: string
  content: string
  tags: string[]
  author: { _id: string; name: string; role: string } | string | null
  viewCount: number
  isPublished: boolean
  helpfulYes: number
  helpfulNo: number
  createdAt: string
}

export default function KnowledgeList() {
  const { user } = useAuth()
  const [articles, setArticles] = useState<KbArticle[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const isStaff = user?.role !== 'employee'

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      const { data } = await api.get<{ articles: KbArticle[]; meta: PageMeta }>(`/knowledge?${params}`)
      setArticles(data.articles)
      setMeta(data.meta)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Knowledge Base</h1>
        {isStaff && (
          <Link
            to="/knowledge/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New article
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search articles, tags…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-80 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : articles.length === 0 ? (
        <EmptyState icon="📚" title="No articles found" hint={isStaff ? 'Write the first one!' : 'Try a different search.'} />
      ) : (
        <div className="mt-4 space-y-3">
          {articles.map((a) => (
            <Link
              key={a._id}
              to={`/knowledge/${a._id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {a.category}
                </span>
                {!a.isPublished && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    Draft
                  </span>
                )}
                <span className="text-xs text-slate-400">👁 {a.viewCount}</span>
              </div>
              <h2 className="mt-2 font-semibold text-slate-900 dark:text-white">{a.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                {a.content.replace(/[#*`\[\]]/g, '').slice(0, 160)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.tags.map((t) => (
                  <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    #{t}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>Page {meta.page} of {meta.totalPages}</span>
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
