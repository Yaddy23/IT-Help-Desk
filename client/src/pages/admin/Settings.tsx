import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import api from '@/api/client'
import { Spinner } from '@/components/ui/badges'

interface SettingsDoc {
  companyName: string
  slaHours: { low: number; medium: number; high: number; critical: number }
  ticketCategories: string[]
  emailNotificationsEnabled: boolean
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white'
const labelCls = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300'

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsDoc | null>(null)
  const [categories, setCategories] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<SettingsDoc>('/settings').then(({ data }) => {
      setSettings(data)
      setCategories(data.ticketCategories.join(', '))
    })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    setSaved(false)
    try {
      const { data } = await api.put<SettingsDoc>('/settings', {
        companyName: settings.companyName,
        slaHours: settings.slaHours,
        ticketCategories: categories.split(',').map((c) => c.trim()).filter(Boolean),
        emailNotificationsEnabled: settings.emailNotificationsEnabled,
      })
      setSettings(data)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (!settings) return <Spinner />

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div>
          <label htmlFor="company" className={labelCls}>Company / help desk name</label>
          <input
            id="company"
            value={settings.companyName}
            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            className={inputCls}
          />
        </div>

        <div>
          <p className={labelCls}>SLA hours by priority</p>
          <div className="grid grid-cols-4 gap-3">
            {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
              <div key={p}>
                <label htmlFor={`sla-${p}`} className="mb-1 block text-xs capitalize text-slate-500 dark:text-slate-400">
                  {p}
                </label>
                <input
                  id={`sla-${p}`}
                  type="number"
                  min={1}
                  value={settings.slaHours[p]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      slaHours: { ...settings.slaHours, [p]: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">Changing these affects newly created tickets only.</p>
        </div>

        <div>
          <label htmlFor="cats" className={labelCls}>Ticket categories (comma-separated)</label>
          <input id="cats" value={categories} onChange={(e) => setCategories(e.target.value)} className={inputCls} />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={settings.emailNotificationsEnabled}
            onChange={(e) => setSettings({ ...settings, emailNotificationsEnabled: e.target.checked })}
          />
          Email notifications enabled
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
        </div>
      </form>
    </div>
  )
}
