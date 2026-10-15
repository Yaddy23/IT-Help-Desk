import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/api/client'
import type { Asset, AssetStatus, DeviceType } from '@/types'

const DEVICE_TYPES: DeviceType[] = ['laptop', 'desktop', 'monitor', 'printer', 'phone', 'network', 'peripheral', 'other']
const STATUSES: AssetStatus[] = ['in_stock', 'in_use', 'in_repair', 'retired']

export default function NewAsset() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    assetTag: '',
    serialNumber: '',
    deviceType: 'laptop' as DeviceType,
    brand: '',
    model: '',
    status: 'in_stock' as AssetStatus,
    location: '',
    purchaseDate: '',
    warrantyExpiry: '',
    cost: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { data } = await api.post<Asset>('/assets', {
        ...form,
        cost: form.cost ? Number(form.cost) : undefined,
        purchaseDate: form.purchaseDate || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
      })
      navigate(`/assets/${data._id}`)
    } catch {
      setError('Could not save the asset — is the asset tag unique?')
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white'
  const labelCls = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300'

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New asset</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tag" className={labelCls}>Asset tag *</label>
            <input id="tag" required value={form.assetTag} onChange={(e) => set('assetTag', e.target.value)} placeholder="AST-0001" className={inputCls} />
          </div>
          <div>
            <label htmlFor="serial" className={labelCls}>Serial number</label>
            <input id="serial" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="type" className={labelCls}>Device type *</label>
            <select id="type" value={form.deviceType} onChange={(e) => set('deviceType', e.target.value as DeviceType)} className={inputCls}>
              {DEVICE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className={labelCls}>Status</label>
            <select id="status" value={form.status} onChange={(e) => set('status', e.target.value as AssetStatus)} className={inputCls}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="brand" className={labelCls}>Brand</label>
            <input id="brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Dell" className={inputCls} />
          </div>
          <div>
            <label htmlFor="model" className={labelCls}>Model</label>
            <input id="model" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Latitude 5540" className={inputCls} />
          </div>
          <div>
            <label htmlFor="loc" className={labelCls}>Location</label>
            <input id="loc" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="HQ · Floor 2" className={inputCls} />
          </div>
          <div>
            <label htmlFor="cost" className={labelCls}>Cost ($)</label>
            <input id="cost" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => set('cost', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="purch" className={labelCls}>Purchase date</label>
            <input id="purch" type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="warr" className={labelCls}>Warranty expiry</label>
            <input id="warr" type="date" value={form.warrantyExpiry} onChange={(e) => set('warrantyExpiry', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="notes" className={labelCls}>Notes</label>
          <textarea id="notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={inputCls} />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save asset'}
        </button>
      </form>
    </div>
  )
}
