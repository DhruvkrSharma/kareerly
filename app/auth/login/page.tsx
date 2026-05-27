'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [mode, setMode]         = useState<'login' | 'signup'>('login')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [message, setMessage]   = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    const supabase = createClient()
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/feed')
        router.refresh()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--surface)' }}
    >
      {/* Left panel — quote & branding */}
      <div
        className="hidden md:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{ background: 'var(--surface-container-lowest)' }}
      >
        {/* Background glow */}
        <div
          className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-10 blur-[120px] pointer-events-none"
          style={{ background: 'var(--primary-container)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full opacity-5 blur-[80px] pointer-events-none"
          style={{ background: 'var(--secondary)' }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--on-surface)' }}>
            <span style={{ color: 'var(--primary-container)' }}>K</span>areerly
          </h1>
        </div>

        {/* Quote */}
        <div className="relative z-10 max-w-md">
          <blockquote
            className="text-2xl font-display font-bold leading-relaxed"
            style={{ color: 'var(--on-surface)' }}
          >
            &ldquo;Your career is not a ladder; it&apos;s a jungle gym. Find the right path and accelerate your growth.&rdquo;
          </blockquote>
          <p className="text-sm mt-4 font-display font-semibold" style={{ color: 'var(--primary-container)' }}>
            The Future of Work
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex gap-4 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
          <button className="hover:text-on-surface transition-colors">Privacy</button>
          <button className="hover:text-on-surface transition-colors">Terms</button>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="md:hidden text-center mb-8">
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--on-surface)' }}>
              <span style={{ color: 'var(--primary-container)' }}>K</span>areerly
            </h1>
          </div>

          {/* Heading */}
          <h2 className="text-headline-lg mb-2" style={{ color: 'var(--on-surface)' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--on-surface-variant)' }}>
            {mode === 'login'
              ? 'Sign in to continue your professional journey.'
              : 'Start your AI-powered career discovery.'}
          </p>

          <div className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-label-sm uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors"
                style={{
                  background: 'var(--surface-container)',
                  borderColor: 'var(--outline-variant)',
                  color: 'var(--on-surface)',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary-container)')}
                onBlur={e => (e.target.style.borderColor = 'var(--outline-variant)')}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-label-sm uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none border transition-colors"
                  style={{
                    background: 'var(--surface-container)',
                    borderColor: 'var(--outline-variant)',
                    color: 'var(--on-surface)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary-container)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--outline-variant)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            {mode === 'login' && (
              <div className="text-right">
                <button className="text-xs font-semibold transition-colors" style={{ color: 'var(--primary-container)' }}>
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 rounded-xl border text-sm"
                  style={{
                    background: 'color-mix(in srgb, var(--error) 10%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--error) 30%, transparent)',
                    color: 'var(--error)',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 rounded-xl border text-sm"
                  style={{
                    background: 'color-mix(in srgb, var(--tertiary) 10%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--tertiary) 30%, transparent)',
                    color: 'var(--tertiary)',
                  }}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full justify-center text-base flex items-center gap-2"
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full border-2 animate-spin-slow"
                    style={{ borderColor: 'transparent', borderTopColor: 'var(--on-primary-container)' }}
                  />
                  Please wait…
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </div>

          {/* Toggle mode */}
          <p className="text-center text-sm mt-8" style={{ color: 'var(--on-surface-variant)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMessage(null) }}
              className="font-semibold transition-colors"
              style={{ color: 'var(--primary-container)' }}
            >
              {mode === 'login' ? 'Sign up for free' : 'Sign in'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
