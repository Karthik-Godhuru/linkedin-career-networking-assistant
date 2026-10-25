import React from 'react'
import {
  ExternalLink,
  Building2,
  MapPin,
  CheckCircle2,
  Sparkles,
  Bookmark,
  Check,
  X,
  RotateCcw,
  Clock,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import type { CandidateRecord, CandidateCategory, CandidateStatus } from '../../types/candidate'

interface CandidateCardProps {
  candidate: CandidateRecord
  onStatusChange?: (candidateId: string, newStatus: CandidateStatus) => void | Promise<unknown>
  onOpenOutreach?: (candidateId: string) => void
  isUpdating?: boolean
}

const categoryBadges: Record<CandidateCategory, { label: string; color: string }> = {
  engineer: { label: 'Engineer / Developer', color: 'bg-blue-950 text-blue-300 border-blue-800' },
  recruiter: { label: 'Technical Recruiter', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  founder: { label: 'Startup Founder', color: 'bg-purple-950 text-purple-300 border-purple-800' },
  alumni: { label: 'Campus Alum', color: 'bg-amber-950 text-amber-300 border-amber-800' },
  mentor: { label: 'Industry Mentor', color: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
}

const statusBadges: Record<CandidateStatus, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  pending: { label: 'Pending Review', color: 'bg-slate-800 text-slate-300 border-slate-700', icon: Clock },
  shortlisted: { label: 'Shortlisted', color: 'bg-amber-950 text-amber-300 border-amber-800 ring-1 ring-amber-500/20', icon: Bookmark },
  approved: { label: 'Approved for Networking', color: 'bg-emerald-950 text-emerald-300 border-emerald-800 ring-1 ring-emerald-500/30', icon: CheckCircle2 },
  dismissed: { label: 'Skipped', color: 'bg-zinc-900 text-zinc-400 border-zinc-800 opacity-80', icon: X },
  archived: { label: 'Archived', color: 'bg-zinc-900 text-zinc-400 border-zinc-800', icon: Clock },
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onStatusChange,
  onOpenOutreach,
  isUpdating = false,
}) => {
  const categoryBadge = categoryBadges[candidate.category] || categoryBadges.engineer
  const currentStatusBadge = statusBadges[candidate.status] || statusBadges.pending
  const StatusIcon = currentStatusBadge.icon
  const score = candidate.match_score ?? 50

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-400 bg-emerald-950/80 border-emerald-800'
    if (s >= 60) return 'text-blue-400 bg-blue-950/80 border-blue-800'
    return 'text-amber-400 bg-amber-950/80 border-amber-800'
  }

  const handleAction = (status: CandidateStatus) => {
    if (onStatusChange && !isUpdating) {
      onStatusChange(candidate.id, status)
    }
  }

  const isApproved = candidate.status === 'approved'
  const isShortlisted = candidate.status === 'shortlisted'
  const isDismissed = candidate.status === 'dismissed'

  return (
    <div
      className={`relative bg-slate-900 border rounded-xl p-5 transition-all text-left space-y-3.5 ${
        isApproved
          ? 'border-emerald-700/80 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/20'
          : isShortlisted
          ? 'border-amber-700/70 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/20'
          : isDismissed
          ? 'border-slate-800/60 opacity-60 bg-slate-950/50'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold text-white tracking-tight">
              {candidate.full_name}
            </h4>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${categoryBadge.color}`}>
              {categoryBadge.label}
            </span>

            {/* Current Review Status Pill */}
            <span
              className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${currentStatusBadge.color}`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {currentStatusBadge.label}
            </span>
          </div>

          {candidate.headline && (
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed pt-0.5">
              {candidate.headline}
            </p>
          )}
        </div>

        {/* Match Score Badge */}
        <div
          className={`shrink-0 flex items-center space-x-1 px-2.5 py-1 rounded-lg border font-mono text-xs font-semibold ${getScoreColor(
            score
          )}`}
          title="Transparent relevance score against your career preferences"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{score}% Match</span>
        </div>
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        {candidate.current_company && (
          <div className="flex items-center space-x-1">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{candidate.current_company}</span>
          </div>
        )}
        {candidate.location && (
          <div className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>{candidate.location}</span>
          </div>
        )}
        <div className="flex items-center space-x-1 text-[11px] text-slate-500 font-mono">
          <span>Source: {candidate.source.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Match Reasons List */}
      {candidate.match_reasons && candidate.match_reasons.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Transparent Matching Rationale:
          </span>
          <div className="space-y-1">
            {candidate.match_reasons.slice(0, 3).map((reason, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>{reason.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestone 5 Networking Handoff Banner (if Approved) */}
      {isApproved && (
        <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 flex items-center justify-between gap-2.5 text-emerald-200 text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">Ready for Outreach:</span>{' '}
              <span>Queued for personalized connection note & follow-ups.</span>
            </div>
          </div>

          {onOpenOutreach && (
            <button
              type="button"
              onClick={() => onOpenOutreach(candidate.id)}
              className="shrink-0 inline-flex items-center px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] rounded-lg shadow-sm transition-all"
            >
              Draft Note
            </button>
          )}
        </div>
      )}

      {/* Human Curation Action Bar */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Review Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {candidate.status === 'pending' ? (
            <>
              <button
                type="button"
                onClick={() => handleAction('shortlisted')}
                disabled={isUpdating}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-amber-950/80 hover:text-amber-300 hover:border-amber-700 border border-slate-700 text-slate-300 transition-all disabled:opacity-50"
                title="Save to review later"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Bookmark className="w-3.5 h-3.5 mr-1 text-amber-400" />}
                Shortlist
              </button>

              <button
                type="button"
                onClick={() => handleAction('approved')}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50"
                title="Approve candidate for networking outreach"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Approve for Networking
              </button>

              <button
                type="button"
                onClick={() => handleAction('dismissed')}
                disabled={isUpdating}
                className="inline-flex items-center px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-red-950/60 hover:text-red-300 hover:border-red-800 border border-slate-700 text-slate-400 transition-all disabled:opacity-50"
                title="Skip this candidate"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Skip
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-1.5">
              {!isApproved && (
                <button
                  type="button"
                  onClick={() => handleAction('approved')}
                  disabled={isUpdating}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-700/80 hover:bg-emerald-600 text-white transition-all disabled:opacity-50"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Approve
                </button>
              )}

              {!isShortlisted && (
                <button
                  type="button"
                  onClick={() => handleAction('shortlisted')}
                  disabled={isUpdating}
                  className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-amber-950 hover:text-amber-300 border border-slate-700 text-slate-300 transition-all disabled:opacity-50"
                >
                  <Bookmark className="w-3 h-3 mr-1 text-amber-400" />
                  Shortlist
                </button>
              )}

              {!isDismissed && (
                <button
                  type="button"
                  onClick={() => handleAction('dismissed')}
                  disabled={isUpdating}
                  className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-zinc-800 text-slate-400 border border-slate-700 transition-all disabled:opacity-50"
                >
                  <X className="w-3 h-3 mr-1" />
                  Skip
                </button>
              )}

              <button
                type="button"
                onClick={() => handleAction('pending')}
                disabled={isUpdating}
                className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                title="Reset review decision back to pending"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </button>
            </div>
          )}
        </div>

        {/* External Link */}
        <div className="flex items-center space-x-3 shrink-0">
          <span className="text-[11px] text-slate-500">
            {new Date(candidate.created_at).toLocaleDateString()}
          </span>

          <a
            href={candidate.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline"
            title="Open external profile in a new browser tab without scraping"
          >
            <span>Open Profile</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>
        </div>
      </div>
    </div>
  )
}
