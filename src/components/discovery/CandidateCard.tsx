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
  engineer: { label: 'Engineer / Developer', color: 'bg-[#E8DFD3] text-[#292722] border-[#D9CFC2]' },
  recruiter: { label: 'Technical Recruiter', color: 'bg-[#EAF2EC] text-[#2E5A36] border-[#C6DEC9]' },
  founder: { label: 'Startup Founder', color: 'bg-[#E8DFD3] text-[#292722] border-[#D9CFC2]' },
  alumni: { label: 'Campus Alum', color: 'bg-[#FBF4E8] text-[#8A5A20] border-[#E8D5B5]' },
  mentor: { label: 'Industry Mentor', color: 'bg-[#E8DFD3] text-[#292722] border-[#D9CFC2]' },
}

const statusBadges: Record<CandidateStatus, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  pending: { label: 'Pending Review', color: 'bg-[#E8DFD3] text-[#73685B] border-[#D9CFC2]', icon: Clock },
  shortlisted: { label: 'Shortlisted', color: 'bg-[#FBF4E8] text-[#8A5A20] border-[#E8D5B5]', icon: Bookmark },
  approved: { label: 'Approved for Networking', color: 'bg-[#EAF2EC] text-[#2E5A36] border-[#C6DEC9]', icon: CheckCircle2 },
  dismissed: { label: 'Skipped', color: 'bg-[#FAF7F2] text-[#73685B] border-[#D9CFC2]', icon: X },
  archived: { label: 'Archived', color: 'bg-[#FAF7F2] text-[#73685B] border-[#D9CFC2]', icon: Clock },
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
    if (s >= 80) return 'text-[#9C7B4C] bg-[#C6A76B]/15 border-[#C6A76B]/40 font-semibold'
    if (s >= 60) return 'text-[#292722] bg-[#E8DFD3] border-[#D9CFC2]'
    return 'text-[#8A5A20] bg-[#FBF4E8] border-[#E8D5B5]'
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
      className={`relative bg-[#FAF7F2] border rounded-2xl p-5 sm:p-6 transition-all text-left space-y-3.5 shadow-sm ${
        isApproved
          ? 'border-[#C6DEC9] bg-[#EAF2EC]/20'
          : isShortlisted
          ? 'border-[#C6A76B]/60 bg-[#C6A76B]/5'
          : isDismissed
          ? 'border-[#D9CFC2] opacity-60'
          : 'border-[#D9CFC2] hover:border-[#C6A76B]/60'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold text-[#292722] tracking-tight">
              {candidate.full_name}
            </h4>
            <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${categoryBadge.color}`}>
              {categoryBadge.label}
            </span>

            {/* Current Review Status Pill */}
            <span
              className={`inline-flex items-center text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${currentStatusBadge.color}`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {currentStatusBadge.label}
            </span>
          </div>

          {candidate.headline && (
            <p className="text-xs text-[#73685B] line-clamp-2 leading-relaxed pt-0.5">
              {candidate.headline}
            </p>
          )}
        </div>

        {/* Match Score Badge */}
        <div
          className={`shrink-0 flex items-center space-x-1 px-2.5 py-1 rounded-md border font-mono text-xs font-semibold ${getScoreColor(
            score
          )}`}
          title="Transparent relevance score against your career preferences"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{score}% Match</span>
        </div>
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#73685B]">
        {candidate.current_company && (
          <div className="flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#B49A7D]" />
            <span>{candidate.current_company}</span>
          </div>
        )}
        {candidate.location && (
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#B49A7D]" />
            <span>{candidate.location}</span>
          </div>
        )}
        <div className="flex items-center space-x-1 text-[11px] text-[#73685B] font-mono">
          <span>Source: {candidate.source.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Match Reasons List */}
      {candidate.match_reasons && candidate.match_reasons.length > 0 && (
        <div className="pt-2 border-t border-[#D9CFC2]">
          <span className="text-[11px] font-semibold text-[#73685B] uppercase tracking-wider block mb-1.5">
            Matching Rationale
          </span>
          <div className="space-y-1">
            {candidate.match_reasons.slice(0, 3).map((reason, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-[#73685B]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2E5A36] shrink-0 mt-0.5" />
                <span>{reason.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestone 5 Networking Handoff Banner (if Approved) */}
      {isApproved && (
        <div className="p-2.5 rounded-md bg-[#EAF2EC] border border-[#C6DEC9] flex items-center justify-between gap-2.5 text-[#2E5A36] text-xs">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-[#2E5A36] shrink-0" />
            <div>
              <span className="font-semibold text-[#292722]">Ready for Outreach:</span>{' '}
              <span>Queued for personalized connection note &amp; follow-ups.</span>
            </div>
          </div>

          {onOpenOutreach && (
            <button
              type="button"
              onClick={() => onOpenOutreach(candidate.id)}
              className="shrink-0 inline-flex items-center px-2.5 py-1 bg-[#2E5A36] hover:bg-[#254A2C] text-[#FAF7F2] font-medium text-[11px] rounded transition-colors"
            >
              Draft Note
            </button>
          )}
        </div>
      )}

      {/* Human Curation Action Bar */}
      <div className="pt-3 border-t border-[#D9CFC2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Review Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {candidate.status === 'pending' ? (
            <>
              <button
                type="button"
                onClick={() => handleAction('shortlisted')}
                disabled={isUpdating}
                className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#FAF7F2] hover:bg-[#E8DFD3] border border-[#D9CFC2] text-[#292722] transition-colors disabled:opacity-50"
                title="Save to review later"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Bookmark className="w-3.5 h-3.5 mr-1 text-[#8A5A20]" />}
                Shortlist
              </button>

              <button
                type="button"
                onClick={() => handleAction('approved')}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] transition-colors disabled:opacity-50"
                title="Approve candidate for networking outreach"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Approve for Networking
              </button>

              <button
                type="button"
                onClick={() => handleAction('dismissed')}
                disabled={isUpdating}
                className="inline-flex items-center px-2 py-1.5 rounded-md text-xs font-medium bg-[#FAF7F2] hover:bg-[#E8DFD3] border border-[#D9CFC2] text-[#73685B] transition-colors disabled:opacity-50"
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
                  className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#1C1B19] hover:bg-[#292722] text-[#FAF7F2] border border-[#C6A76B]/40 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Check className="w-3 h-3 mr-1 text-[#C6A76B]" />
                  Approve
                </button>
              )}

              {!isShortlisted && (
                <button
                  type="button"
                  onClick={() => handleAction('shortlisted')}
                  disabled={isUpdating}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#FAF7F2] hover:bg-[#E8DFD3] border border-[#D9CFC2] hover:border-[#C6A76B]/40 text-[#292722] transition-colors disabled:opacity-50"
                >
                  <Bookmark className="w-3 h-3 mr-1 text-[#9C7B4C]" />
                  Shortlist
                </button>
              )}

              {!isDismissed && (
                <button
                  type="button"
                  onClick={() => handleAction('dismissed')}
                  disabled={isUpdating}
                  className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-[#FAF7F2] hover:bg-[#E8DFD3] border border-[#D9CFC2] text-[#73685B] transition-colors disabled:opacity-50"
                >
                  <X className="w-3 h-3 mr-1" />
                  Skip
                </button>
              )}

              <button
                type="button"
                onClick={() => handleAction('pending')}
                disabled={isUpdating}
                className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium text-[#73685B] hover:text-[#292722] transition-colors disabled:opacity-50"
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
          <span className="text-[11px] text-[#73685B]">
            {new Date(candidate.created_at).toLocaleDateString()}
          </span>

          <a
            href={candidate.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-medium text-[#292722] hover:text-[#B49A7D] hover:underline"
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
