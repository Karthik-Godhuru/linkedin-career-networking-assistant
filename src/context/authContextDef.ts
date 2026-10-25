import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isConfigured: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null; confirmationRequired?: boolean }>
  signOut: () => Promise<void>
  authError: string | null
  clearError: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
