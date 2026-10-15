import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import heroImg from '@/assets/hero.png'

export default function Login() {
  const { login } = useAuth()
  const { dark, toggle } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? 'Invalid email or password' : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="relative hidden flex-1 flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-800 p-10 text-white lg:flex">
        <div className="flex items-center gap-3 text-xl font-semibold">
          <span className="text-3xl">🛠️</span> IT Help Desk
        </div>
        <div className="flex flex-col items-center">
          <img src={heroImg} alt="" className="w-72 max-w-full" />
          <h1 className="mt-8 max-w-md text-center text-3xl font-bold leading-tight">
            Report problems. Track assets. Get fixed.
          </h1>
          <p className="mt-4 max-w-md text-center text-blue-100">
            One place for IT tickets, company equipment, and everything in between.
          </p>
        </div>
        <p className="text-sm text-blue-200">Internal use only · © {new Date().getFullYear()}</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in</h2>
            <button
              onClick={toggle}
              className="rounded-lg p-2 hover:bg-slate-200 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
              className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Demo accounts: admin@demo.com · itstaff@demo.com · employee@demo.com (Password123!)
          </p>
        </div>
      </div>
    </div>
  )
}
