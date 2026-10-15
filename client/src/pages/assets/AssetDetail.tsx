import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '@/api/client'
import { Spinner } from '@/components/ui/badges'
import { useAuth } from '@/context/AuthContext'
import type { Asset, AssetAssignment, MaintenanceRecord, User } from '@/types'

const ASSET_STATUSES = ['in_stock', 'in_use', 'in_repair', 'retired'] as const
const MAINT_TYPES = ['repair', 'upgrade', 'inspection', 'replacement'] as const

interface DetailResponse {
  asset: Asset
  assignments: AssetAssignment[]
  maintenance: MaintenanceRecord[]
}

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [data, setData] = useState<DetailResponse | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [conditionOut, setConditionOut] = useState('')
  const [conditionIn, setConditionIn] = useState('')
  const [maint, setMaint] = useState({ type: 'inspection', description: '', performedBy: '', cost: '' })

  const isStaff = user?.role !== 'employee'

  const load = useCallback(async () => {
    if (!id) return
    const { data } = await api.get<DetailResponse>(`/assets/${id}`)
    setData(data)
  }, [id])

  useEffect(() => {
    load().catch(() => setError('Failed to load asset'))
  }, [load])

  useEffect(() => {
    if (isStaff) {
      api
        .get<User[]>('/users', { params: { limit: 200 } })
        .then(({ data }) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]))
    }
  }, [isStaff])

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-red-700 dark:bg-red-950/50 dark:text-red-300">
        {error} · <Link to="/assets" className="underline">back to assets</Link>
      </div>
    )
  }
  if (!data) return <Spinner />

  const { asset, assignments, maintenance } = data
  const activeAssignment = assignments.find((a) => !a.returnedAt)

  async function patch(fields: Record<string, unknown>) {
    try {
      await api.patch(`/assets/${id}`, fields)
      await load()
    } catch {
      setError('Update failed')
    }
  }

  async function assign(e: FormEvent) {
    e.preventDefault()
    if (!assignUserId) return
    try {
      await api.post(`/assets/${id}/assign`, { employeeId: assignUserId, conditionOut })
      setAssignUserId('')
      setConditionOut('')
      await load()
    } catch (err) {
      setError('Assign failed — is the asset already assigned?')
      void err
    }
  }

  async function returnAsset() {
    try {
      await api.post(`/assets/${id}/return`, { conditionIn })
      setConditionIn('')
      await load()
    } catch {
      setError('Return failed')
    }
  }

  async function addMaintenance(e: FormEvent) {
    e.preventDefault()
    if (!maint.description.trim()) return
    try {
      await api.post(`/assets/${id}/maintenance`, {
        ...maint,
        cost: maint.cost ? Number(maint.cost) : undefined,
      })
      setMaint({ type: 'inspection', description: '', performedBy: '', cost: '' })
      await load()
    } catch {
      setError('Could not add maintenance record')
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/assets" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← All assets
      </Link>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{asset.assetTag}</h1>
            <p className="text-slate-500 dark:text-slate-400">
              {asset.brand} {asset.model}
            </p>
          </div>
          {isStaff ? (
            <select
              value={asset.status}
              onChange={(e) => patch({ status: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium dark:bg-slate-800">
              {asset.status.replace('_', ' ')}
            </span>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Serial</dt>
            <dd className="text-slate-800 dark:text-slate-200">{asset.serialNumber || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Type</dt>
            <dd className="capitalize text-slate-800 dark:text-slate-200">{asset.deviceType}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Location</dt>
            <dd className="text-slate-800 dark:text-slate-200">{asset.location || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Currently with</dt>
            <dd className="text-slate-800 dark:text-slate-200">
              {asset.assignedTo && typeof asset.assignedTo !== 'string' ? asset.assignedTo.name : 'Unassigned'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Purchased</dt>
            <dd className="text-slate-800 dark:text-slate-200">
              {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Warranty until</dt>
            <dd className="text-slate-800 dark:text-slate-200">
              {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Cost</dt>
            <dd className="text-slate-800 dark:text-slate-200">{asset.cost ? `$${asset.cost.toLocaleString()}` : '—'}</dd>
          </div>
        </dl>
      </div>

      {isStaff && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Assign / return */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Assignment</h2>
            {activeAssignment ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Assigned to{' '}
                  <strong>
                    {typeof activeAssignment.employee === 'string' ? '—' : activeAssignment.employee.name}
                  </strong>{' '}
                  since {new Date(activeAssignment.assignedAt).toLocaleDateString()}
                </p>
                <input
                  value={conditionIn}
                  onChange={(e) => setConditionIn(e.target.value)}
                  placeholder="Condition on return…"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  onClick={returnAsset}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                >
                  ↩ Mark returned
                </button>
              </div>
            ) : (
              <form onSubmit={assign} className="space-y-2">
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Choose employee…</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                <input
                  value={conditionOut}
                  onChange={(e) => setConditionOut(e.target.value)}
                  placeholder="Condition / accessories…"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!assignUserId}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  → Assign
                </button>
              </form>
            )}
          </div>

          {/* Maintenance */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Log maintenance</h2>
            <form onSubmit={addMaintenance} className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={maint.type}
                  onChange={(e) => setMaint({ ...maint, type: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {MAINT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  value={maint.cost}
                  onChange={(e) => setMaint({ ...maint, cost: e.target.value })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Cost $"
                  className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <input
                value={maint.description}
                onChange={(e) => setMaint({ ...maint, description: e.target.value })}
                placeholder="What was done?"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <input
                value={maint.performedBy}
                onChange={(e) => setMaint({ ...maint, performedBy: e.target.value })}
                placeholder="Performed by…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Add record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Assignment history</h2>
          <div className="space-y-2">
            {assignments.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Never assigned.</p>
            )}
            {assignments.map((a) => (
              <div key={a._id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {typeof a.employee === 'string' ? '—' : a.employee.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(a.assignedAt).toLocaleDateString()}
                  {a.returnedAt ? ` → returned ${new Date(a.returnedAt).toLocaleDateString()}` : ' → still assigned'}
                </p>
                {(a.conditionOut || a.conditionIn) && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {a.conditionOut && <>Out: {a.conditionOut}. </>}
                    {a.conditionIn && <>In: {a.conditionIn}</>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Maintenance history</h2>
          <div className="space-y-2">
            {maintenance.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No maintenance records.</p>
            )}
            {maintenance.map((m) => (
              <div key={m._id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium capitalize dark:bg-slate-800">
                    {m.type}
                  </span>
                  <span className="text-xs text-slate-500">{new Date(m.date).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-slate-700 dark:text-slate-300">{m.description}</p>
                {(m.performedBy || m.cost !== undefined) && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {m.performedBy}
                    {m.cost !== undefined && m.cost !== null ? ` · $${m.cost}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
