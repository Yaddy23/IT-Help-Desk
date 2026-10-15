import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/api/client'
import { EmptyState, Spinner } from '@/components/ui/badges'
import { useAuth } from '@/context/AuthContext'
import type { Asset, AssetStatus, DeviceType, PageMeta } from '@/types'

const STATUS_STYLES: Record<AssetStatus, string> = {
  in_stock: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  in_use: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  in_repair: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  retired: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300',
}

const TYPE_ICONS: Record<DeviceType, string> = {
  laptop: '💻',
  desktop: '🖥️',
  monitor: '🔳',
  printer: '🖨️',
  phone: '📱',
  network: '📡',
  peripheral: '🖱️',
  other: '📦',
}

export default function AssetList() {
  const { user } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [deviceType, setDeviceType] = useState('')
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [page, setPage] = useState(1)
  const isStaff = user?.role !== 'employee'

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (deviceType) params.set('deviceType', deviceType)
      if (unassignedOnly) params.set('unassigned', 'true')
      params.set('page', String(page))
      const { data } = await api.get<{ assets: Asset[]; meta: PageMeta }>(`/assets?${params}`)
      setAssets(data.assets)
      setMeta(data.meta)
    } finally {
      setLoading(false)
    }
  }, [search, status, deviceType, unassignedOnly, page])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {isStaff ? 'Assets' : 'My equipment'}
        </h1>
        {isStaff && (
          <Link
            to="/assets/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Asset
          </Link>
        )}
      </div>

      {isStaff && (
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Search tag, serial, model…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
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
            {(Object.keys(STATUS_STYLES) as AssetStatus[]).map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={deviceType}
            onChange={(e) => {
              setDeviceType(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All types</option>
            {(Object.keys(TYPE_ICONS) as DeviceType[]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={(e) => {
                setUnassignedOnly(e.target.checked)
                setPage(1)
              }}
            />
            Unassigned only
          </label>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : assets.length === 0 ? (
        <EmptyState icon="💻" title="No assets found" hint={isStaff ? 'Add your first asset to get started.' : 'Nothing has been assigned to you yet.'} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                {isStaff && <th className="px-4 py-3">Assigned to</th>}
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Warranty</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => {
                const warrantySoon =
                  a.warrantyExpiry && new Date(a.warrantyExpiry) < new Date(Date.now() + 90 * 24 * 3600_000)
                return (
                  <tr
                    key={a._id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
                  >
                    <td className="px-4 py-3">
                      <Link to={`/assets/${a._id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                        {a.assetTag}
                      </Link>
                      <p className="text-slate-700 dark:text-slate-300">
                        {a.brand} {a.model}
                      </p>
                      {a.serialNumber && (
                        <p className="text-xs text-slate-400">S/N {a.serialNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="mr-1">{TYPE_ICONS[a.deviceType]}</span>
                      {a.deviceType}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    {isStaff && (
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {a.assignedTo && typeof a.assignedTo !== 'string' ? a.assignedTo.name : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.location || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {a.warrantyExpiry ? (
                        <span className={warrantySoon ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>
                          {new Date(a.warrantyExpiry).toLocaleDateString()}
                          {warrantySoon ? ' ⚠️' : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} assets
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
