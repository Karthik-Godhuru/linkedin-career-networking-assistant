import React, { useState } from 'react'
import { Mail, Lock, AlertTriangle, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export const AuthCard: React.FC = () => {
  const { signInWithPassword, signUp, authError, clearError, isConfigured } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setFeedbackNotice(null)

    if (!email || !password) {
      return
    }

    setSubmitting(true)

    if (mode === 'signin') {
      const res = await signInWithPassword(email, password)
      if (res.error) {
        // error already set in context
      }
    } else {
      const res = await signUp(email, password)
      if (!res.error) {
        if (res.confirmationRequired) {
          setFeedbackNotice('Account created! Please check your email to confirm your registration.')
        } else {
          setFeedbackNotice('Account created successfully! You are now logged in.')
        }
      }
    }

    setSubmitting(false)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Configuration Status Notice */}
      {!isConfigured && (
        <div className="mb-6 rounded-xl border border-amber-800/80 bg-amber-950/40 p-4 text-left shadow-lg">
          <div className="flex items-start space-x-3">
            <KeyRound className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-200">Supabase Credentials Needed</h4>
              <p className="mt-1 text-xs text-amber-300/80 leading-relaxed">
                To enable live authentication and database persistence, add your Supabase credentials to <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-200">.env</code>:
              </p>
              <pre className="mt-2 p-2 bg-slate-900/80 rounded border border-amber-900/50 text-[11px] font-mono text-amber-100 overflow-x-auto">
                VITE_SUPABASE_URL=https://[project-id].supabase.co{'\n'}
                VITE_SUPABASE_ANON_KEY=[your-anon-key]
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            {mode === 'signin' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {mode === 'signin'
              ? 'Access your career discovery pipeline & tracker'
              : 'Start discovering relevant engineers, mentors and roles'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-800/70 rounded-lg mb-6 border border-slate-700/50">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              clearError()
              setFeedbackNotice(null)
            }}
            className={`py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === 'signin'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              clearError()
              setFeedbackNotice(null)
            }}
            className={`py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === 'signup'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {authError && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/60 flex items-start space-x-2 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {/* Success feedback */}
        {feedbackNotice && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-start space-x-2 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 text-left">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-800/70 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 text-left">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-800/70 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 text-left">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 inline-flex items-center justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            By signing in, you are using your isolated Supabase tenant. All networking actions require manual user dispatch in compliance with LinkedIn service policies.
          </p>
        </div>
      </div>
    </div>
  )
}
