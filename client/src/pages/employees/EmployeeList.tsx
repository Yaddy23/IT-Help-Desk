import { useCallback, useEffect, useState } from 'react'
import api from '@/api/client'
import { EmptyState, Spinner } from '@/components/ui/badges'
import { useAuth } from '@/context/AuthContext'
import type { PageMeta, User } from '@/types'

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  it_staff: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  employee: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

export default function EmployeeList() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const isAdmin = me?.role === 'admin'

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      const { data } = await api.get<{ users: User[]; meta: PageMeta }>(`/admin/users?${params}`)
      setUsers(data.users)
      setMeta(data.meta)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function patchUser(id: string, fields: Record<string, unknown>) {
    await api.patch(`/admin/users/${id}`, fields)
    await fetchUsers()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employees</h1>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search name, email, title…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-72 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState icon="👥" title="No people found" />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Job title</th>
                {isAdmin && <th className="px-4 py-3">Active</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-slate-100 last:border-0 dark:border-slate-900">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        value={u.role}
                        onChange={(e) => void patchUser(u._id, { role: e.target.value })}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[u.role]} border-0`}
                      >
                        <option value="employee">employee</option>
                        <option value="it_staff">it staff</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[u.role]}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {typeof u.department === 'object' ? u.department?.name : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.jobTitle || '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={u.isActive}
                        disabled={u._id === me?._id}
                        onChange={(e) => void patchUser(u._id, { isActive: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
