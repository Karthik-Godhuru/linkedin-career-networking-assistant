import React, { useState } from 'react'
import {
  ShieldCheck,
  Share2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  RefreshCw,
  LogOut,
  User,
  KeyRound,
} from 'lucide-react'
import { useLinkedInConnection } from '../../hooks/useLinkedInConnection'

export const LinkedInIntegrationCard: React.FC = () => {
  const {
    connection,
    loading,
    connecting,
    error,
    actionNotice,
    connect,
    disconnect,
    refresh,
    clearNotice,
  } = useLinkedInConnection()

  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const handleDisconnect = async () => {
    setDisconnecting(true)
    await disconnect()
    setDisconnecting(false)
    setConfirmDisconnect(false)
  }

  return (
    <div className="w-full bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-6 sm:p-7 border-b border-[#D9CFC2] bg-[#FAF7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-[#1C1B19] border border-[#C6A76B]/40 flex items-center justify-center font-bold text-[#FAF7F2] text-sm shrink-0 shadow-xs">
            <span className="text-[#C6A76B] font-serif italic text-base">in</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-[#292722] tracking-tight">
                LinkedIn OAuth 2.0 Integration
              </h3>
              {connection.connected ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#EAF2EC] text-[#2E5A36] border border-[#C6DEC9] text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#E8DFD3] text-[#73685B] border border-[#D9CFC2] text-[11px] font-medium">
                  Disconnected
                </span>
              )}
            </div>
            <p className="text-xs text-[#73685B] mt-0.5">
              Official OpenID Connect profile sync and user-approved Member Share publishing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="p-2 text-[#73685B] hover:text-[#292722] rounded-xl hover:bg-[#E8DFD3] transition-colors border border-transparent hover:border-[#D9CFC2]"
            title="Refresh connection status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionNotice && (
        <div className="mx-6 mt-6 p-4 rounded-xl bg-[#EAF2EC] border border-[#C6DEC9] flex items-start justify-between text-xs text-[#2E5A36]">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={clearNotice} className="text-[#2E5A36] hover:underline font-semibold ml-4">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-6 p-4 rounded-xl bg-[#FCEEEE] border border-[#F0C4C4] flex items-start justify-between text-xs text-[#942F2F]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">LinkedIn Authorization Notice</p>
              <p className="mt-0.5 text-[#942F2F]/90 leading-relaxed">{error}</p>
            </div>
          </div>
          <button onClick={clearNotice} className="text-[#942F2F] hover:underline font-semibold ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Body */}
      <div className="p-6 sm:p-7 space-y-6">
        {connection.connected ? (
          /* Connected State */
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-[#F4EEE6] border border-[#D9CFC2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {connection.pictureUrl ? (
                  <img
                    src={connection.pictureUrl}
                    alt={connection.name || 'Member'}
                    className="w-14 h-14 rounded-2xl object-cover border border-[#C6A76B]/40 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-[#1C1B19] border border-[#C6A76B]/40 flex items-center justify-center text-[#C6A76B] shadow-xs">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-[#292722]">
                    {connection.name || 'LinkedIn Member'}
                  </h4>
                  {connection.email && (
                    <p className="text-xs text-[#73685B] mt-0.5">{connection.email}</p>
                  )}
                  {connection.memberId && (
                    <p className="text-[11px] font-mono text-[#73685B] mt-1">
                      Member URN: urn:li:person:{connection.memberId}
                    </p>
                  )}
                  {connection.connectedAt && (
                    <p className="text-[11px] text-[#73685B] mt-0.5">
                      Connected: {new Date(connection.connectedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div>
                {!confirmDisconnect ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(true)}
                    className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAF7F2] border border-[#D9CFC2] text-[#942F2F] hover:bg-[#FCEEEE] hover:border-[#F0C4C4] transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Disconnect
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#942F2F] text-white hover:bg-[#7D2626] transition-colors disabled:opacity-50"
                    >
                      {disconnecting ? 'Disconnecting...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDisconnect(false)}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-[#73685B] hover:text-[#292722]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Granted Scopes */}
            <div>
              <h5 className="text-xs font-semibold text-[#292722] uppercase tracking-wider mb-2.5">
                Authorized Scopes
              </h5>
              <div className="flex flex-wrap gap-2">
                {(connection.scopes.length > 0
                  ? connection.scopes
                  : ['openid', 'profile', 'email', 'w_member_social']
                ).map((scope) => (
                  <span
                    key={scope}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#D9CFC2] text-xs font-mono text-[#292722]"
                  >
                    <KeyRound className="w-3 h-3 mr-1 text-[#C6A76B]" />
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            {/* Token Security Status */}
            <div className="p-4 rounded-xl bg-[#F4EEE6] border border-[#D9CFC2] flex items-start gap-3">
              <Lock className="w-4 h-4 text-[#C6A76B] shrink-0 mt-0.5" />
              <div className="text-xs text-[#73685B] leading-relaxed">
                <span className="font-semibold text-[#292722]">Encrypted Server-Side Storage:</span> Your access and refresh tokens are encrypted using authenticated AES-256-GCM in Supabase. Plaintext tokens are never exposed to browser storage, logs, or network payloads.
              </div>
            </div>
          </div>
        ) : (
          /* Disconnected State */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#F4EEE6] border border-[#D9CFC2]">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-[#C6A76B]" />
                  <h4 className="text-xs font-semibold text-[#292722] uppercase tracking-wider">
                    Sign In with LinkedIn (OpenID Connect)
                  </h4>
                </div>
                <p className="text-xs text-[#73685B] leading-relaxed">
                  Fetches verified member name, profile photo, and registered email address to associate with your career assistant profile.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F4EEE6] border border-[#D9CFC2]">
                <div className="flex items-center gap-2 mb-2">
                  <Share2 className="w-4 h-4 text-[#C6A76B]" />
                  <h4 className="text-xs font-semibold text-[#292722] uppercase tracking-wider">
                    Share on LinkedIn
                  </h4>
                </div>
                <p className="text-xs text-[#73685B] leading-relaxed">
                  Enables 1-click publishing of user-approved post drafts directly to your personal LinkedIn feed via the official Member Share API.
                </p>
              </div>
            </div>

            {/* Policy & Safety Notice */}
            <div className="p-4 rounded-xl bg-[#FBF4E8] border border-[#E8D5B5] flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-[#8A5A20] shrink-0 mt-0.5" />
              <div className="text-xs text-[#8A5A20] leading-relaxed">
                <span className="font-semibold">Compliance Guarantee:</span> Connecting your account uses official LinkedIn OAuth 2.0 with minimal scopes (<code className="font-mono text-[11px] bg-[#FAF7F2] px-1 py-0.5 rounded">openid</code>, <code className="font-mono text-[11px] bg-[#FAF7F2] px-1 py-0.5 rounded">profile</code>, <code className="font-mono text-[11px] bg-[#FAF7F2] px-1 py-0.5 rounded">email</code>, <code className="font-mono text-[11px] bg-[#FAF7F2] px-1 py-0.5 rounded">w_member_social</code>). This application does not automate connection invites, message scrapers, or background scraping.
              </div>
            </div>

            {/* Action Area */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-[#73685B]">
                Supabase authentication remains separate. You can disconnect your LinkedIn account at any time.
              </div>

              <button
                type="button"
                onClick={connect}
                disabled={connecting}
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#1C1B19] hover:bg-[#292722] text-[#FAF7F2] border border-[#C6A76B]/40 text-xs sm:text-sm font-semibold transition-all shadow-sm hover:border-[#C6A76B] disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin text-[#C6A76B]" />
                    <span>Connecting to LinkedIn...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2 text-[#C6A76B]" />
                    <span>Connect LinkedIn Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
