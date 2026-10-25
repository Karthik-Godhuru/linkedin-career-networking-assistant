import React from 'react'
import { LogOut, User as UserIcon, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export const Navbar: React.FC = () => {
  const { user, signOut, isConfigured } = useAuth()

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-sm shadow-blue-500/20">
            in
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white tracking-tight">Career Assistant</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                Milestone 8 (Release Ready)
              </span>
            </div>
            <p className="text-xs text-slate-400">Compliant Networking & Discovery</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs">
            {isConfigured ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Supabase Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Supabase Setup Required
              </span>
            )}
          </div>

          {user && (
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
              <div className="flex items-center space-x-2 text-sm text-slate-300">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <UserIcon className="w-4 h-4" />
                </div>
                <span className="hidden md:inline max-w-[160px] truncate">{user.email}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center text-xs font-medium px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
