import React, { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { AuthContext } from './authContextDef'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const configured = isSupabaseConfigured()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(configured)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (!configured) {
      return
    }

    // Get current session on load
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setAuthError(error.message)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [configured])

  const signInWithPassword = async (email: string, password: string) => {
    setAuthError(null)
    if (!configured) {
      return { error: 'Supabase credentials are not configured in your .env file.' }
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setAuthError(error.message)
        return { error: error.message }
      }
      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setAuthError(msg)
      return { error: msg }
    }
  }

  const signUp = async (email: string, password: string) => {
    setAuthError(null)
    if (!configured) {
      return { error: 'Supabase credentials are not configured in your .env file.' }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        setAuthError(error.message)
        return { error: error.message }
      }
      const confirmationRequired = !data.session
      return { error: null, confirmationRequired }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setAuthError(msg)
      return { error: msg }
    }
  }

  const signOut = async () => {
    if (configured) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setSession(null)
  }

  const clearError = () => setAuthError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: configured,
        signInWithPassword,
        signUp,
        signOut,
        authError,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
