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
        <div className="mb-6 rounded-lg border border-[#E8D5B5] bg-[#FBF4E8] p-4 text-left">
          <div className="flex items-start space-x-3">
            <KeyRound className="w-5 h-5 text-[#8A5A20] mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-[#8A5A20]">Supabase Credentials Needed</h4>
              <p className="mt-1 text-xs text-[#73685B] leading-relaxed">
                To enable live authentication and database persistence, add your Supabase credentials to <code className="bg-[#FAF7F2] border border-[#E8D5B5] px-1 py-0.5 rounded text-[#8A5A20] font-mono">.env</code>:
              </p>
              <pre className="mt-2 p-2.5 bg-[#FAF7F2] rounded border border-[#E8D5B5] text-[11px] font-mono text-[#292722] overflow-x-auto">
                VITE_SUPABASE_URL=https://[project-id].supabase.co{'\n'}
                VITE_SUPABASE_ANON_KEY=[your-anon-key]
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-light text-[#292722] tracking-tight">
            {mode === 'signin' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="text-xs text-[#73685B] mt-1.5 font-normal">
            {mode === 'signin'
              ? 'Access your career discovery pipeline & tracker'
              : 'Start discovering relevant engineers, mentors and roles'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-[#E8DFD3] rounded-xl mb-6 border border-[#D9CFC2]">
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              clearError()
              setFeedbackNotice(null)
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-[#1C1B19] text-[#FAF7F2] border border-[#C6A76B]/40 shadow-xs'
                : 'text-[#73685B] hover:text-[#292722]'
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
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-[#1C1B19] text-[#FAF7F2] border border-[#C6A76B]/40 shadow-xs'
                : 'text-[#73685B] hover:text-[#292722]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {authError && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#FCEEEE] border border-[#F0C4C4] flex items-start space-x-2 text-xs text-[#942F2F] font-medium">
            <AlertTriangle className="w-4 h-4 text-[#942F2F] shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {/* Success feedback */}
        {feedbackNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#EAF2EC] border border-[#C6DEC9] flex items-start space-x-2 text-xs text-[#2E5A36] font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#2E5A36] shrink-0 mt-0.5" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#292722] mb-1.5 text-left">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#73685B]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#292722] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292722] mb-1.5 text-left">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#73685B]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#292722] transition-colors"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#73685B] text-left">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 inline-flex items-center justify-center py-2.5 px-4 bg-[#1C1B19] hover:bg-[#292722] text-[#FAF7F2] border border-[#C6A76B]/40 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4 ml-2 text-[#C6A76B]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#D9CFC2] text-center">
          <p className="text-[11px] text-[#73685B] leading-relaxed">
            By signing in, you are using your isolated Supabase tenant. All networking actions require manual user dispatch in compliance with LinkedIn service policies.
          </p>
        </div>
      </div>
    </div>
  )
}
