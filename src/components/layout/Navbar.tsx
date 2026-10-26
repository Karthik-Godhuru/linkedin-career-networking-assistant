import React from 'react'
import { LogOut, User as UserIcon, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export const Navbar: React.FC = () => {
  const { user, signOut, isConfigured } = useAuth()

  return (
    <header className="border-b border-[#D9CFC2] bg-[#FAF7F2]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="h-9 w-9 rounded-lg bg-[#1C1B19] border border-[#C6A76B]/50 flex items-center justify-center font-bold text-[#FAF7F2] text-sm tracking-wider shadow-sm">
            <span className="text-[#FAF7F2]">in</span>
          </div>
          <div>
            <span className="font-semibold text-[#292722] tracking-tight text-base block">
              Career Assistant
            </span>
            <p className="text-xs text-[#73685B] tracking-normal font-normal">
              High-Signal Career Discovery & Networking
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs">
            {isConfigured ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#EAF2EC] text-[#2E5A36] border border-[#C6DEC9] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-[#2E5A36]" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FBF4E8] text-[#8A5A20] border border-[#E8D5B5] font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-[#8A5A20]" />
                Setup Needed
              </span>
            )}
          </div>

          {user && (
            <div className="flex items-center space-x-3 pl-3 border-l border-[#D9CFC2]">
              <div className="flex items-center space-x-2 text-xs text-[#73685B]">
                <div className="w-7 h-7 rounded-lg bg-[#1C1B19] border border-[#C6A76B]/40 flex items-center justify-center text-[#C6A76B]">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <span className="hidden md:inline max-w-[160px] truncate font-medium text-[#292722]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#D9CFC2] hover:bg-[#E8DFD3] hover:border-[#C6A76B]/50 text-[#292722] transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5 text-[#73685B]" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
