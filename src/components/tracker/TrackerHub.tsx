import React, { useState } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Search,
  Filter,
  Users,
  Send,
  UserCheck,
  Check,
  Building2,
  FileText,
  Loader2,
  Info,
  CalendarClock,
  Sparkles,
} from 'lucide-react'
import { useCandidates } from '../../hooks/useCandidates'
import { useNetworkingTracker } from '../../hooks/useNetworkingTracker'
import { STAGE_CONFIGS, type TrackerStatus, type NetworkingTrackerRecord } from '../../types/tracker'
import type { CandidateRecord } from '../../types/candidate'

interface TrackerHubProps {
  onNavigateToOutreach?: (candidateId?: string) => void
  onNavigateToCuration?: () => void
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function getNowIsoString(): string {
  return new Date().toISOString()
}

function getFutureDateString(daysAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

function computeFollowUpStatus(dueDateStr: string | null, todayStr: string) {
  if (!dueDateStr) return null
  const due = new Date(dueDateStr)
  const today = new Date(todayStr)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return {
    isOverdue: diffDays < 0,
    isDueToday: diffDays === 0,
    isUpcoming: diffDays > 0,
    days: diffDays,
  }
}

export const TrackerHub: React.FC<TrackerHubProps> = ({
  onNavigateToOutreach,
  onNavigateToCuration,
}) => {
  const { candidates, loading: candidatesLoading } = useCandidates()
  const { trackerMap, loading: trackerLoading, updatingId, error, updateTracker } = useNetworkingTracker()

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterFollowUpOnly, setFilterFollowUpOnly] = useState<boolean>(false)
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState<string>('')
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Approved candidates participate in the pipeline
  const approvedCandidates = candidates.filter((c) => c.status === 'approved')

  const [todayStr] = useState<string>(() => getTodayString())

  // Combined candidate items
  const pipelineItems = approvedCandidates.map((cand) => {
    const tracker: NetworkingTrackerRecord = trackerMap[cand.id] || {
      candidate_id: cand.id,
      user_id: '',
      status: 'ready_to_send',
      invitation_sent_at: null,
      connected_at: null,
      next_follow_up_date: null,
      notes: null,
    }

    const followUpInfo = computeFollowUpStatus(tracker.next_follow_up_date, todayStr)

    return {
      candidate: cand,
      tracker,
      followUpInfo,
    }
  })

  // Pipeline Counts
  const totalInPipeline = pipelineItems.length
  const sentCount = pipelineItems.filter((item) => item.tracker.status === 'invitation_sent').length
  const connectedCount = pipelineItems.filter(
    (item) =>
      item.tracker.status === 'connected' ||
      item.tracker.status === 'conversation_active' ||
      item.tracker.status === 'relationship_established'
  ).length
  const repliesCount = pipelineItems.filter((item) => item.tracker.status === 'conversation_active').length
  const followUpsDueCount = pipelineItems.filter(
    (item) =>
      item.tracker.status === 'follow_up_due' ||
      (item.followUpInfo && (item.followUpInfo.isOverdue || item.followUpInfo.isDueToday))
  ).length

  // Quick Action Handlers
  const handleStageChange = async (candidate: CandidateRecord, newStatus: TrackerStatus) => {
    const current = trackerMap[candidate.id]
    const patch: Partial<NetworkingTrackerRecord> = { status: newStatus }

    if (newStatus === 'invitation_sent' && (!current || !current.invitation_sent_at)) {
      patch.invitation_sent_at = getNowIsoString()
      if (!current || !current.next_follow_up_date) {
        patch.next_follow_up_date = getFutureDateString(4)
      }
    } else if (newStatus === 'connected' && (!current || !current.connected_at)) {
      patch.connected_at = getNowIsoString()
      if (!current || !current.next_follow_up_date) {
        patch.next_follow_up_date = getFutureDateString(4)
      }
    } else if (newStatus === 'conversation_active') {
      patch.next_follow_up_date = getFutureDateString(10)
    }

    const res = await updateTracker(candidate.id, patch)
    if (res.success) {
      const cfg = STAGE_CONFIGS[newStatus]
      setSuccessBanner(`Updated ${candidate.full_name} to "${cfg.label}"`)
      setTimeout(() => setSuccessBanner(null), 3000)
    }
  }

  const handleSetQuickDate = async (candidateId: string, daysAhead: number) => {
    const nextDate = getFutureDateString(daysAhead)
    const res = await updateTracker(candidateId, { next_follow_up_date: nextDate })
    if (res.success) {
      setSuccessBanner(`Follow-up scheduled for ${nextDate} (+${daysAhead}d)`)
      setTimeout(() => setSuccessBanner(null), 3000)
    }
  }

  const handleSaveNotes = async (candidateId: string) => {
    const res = await updateTracker(candidateId, { notes: notesInput.trim() || null })
    if (res.success) {
      setEditingNotesId(null)
      setNotesInput('')
      setSuccessBanner('Conversation notes saved!')
      setTimeout(() => setSuccessBanner(null), 3000)
    }
  }

  // Filter items
  const filteredItems = pipelineItems.filter(({ candidate, tracker, followUpInfo }) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      const matchesName = candidate.full_name.toLowerCase().includes(q)
      const matchesRole = (candidate.headline || '').toLowerCase().includes(q)
      const matchesCompany = (candidate.current_company || '').toLowerCase().includes(q)
      const matchesNotes = (tracker.notes || '').toLowerCase().includes(q)
      if (!matchesName && !matchesRole && !matchesCompany && !matchesNotes) {
        return false
      }
    }

    if (filterFollowUpOnly) {
      const isDue =
        tracker.status === 'follow_up_due' ||
        (followUpInfo && (followUpInfo.isOverdue || followUpInfo.isDueToday))
      if (!isDue) return false
    }

    if (filterStage !== 'all' && tracker.status !== filterStage) {
      return false
    }

    return true
  })

  // Urgent follow-ups requiring today / overdue action
  const urgentFollowUps = pipelineItems.filter(
    (item) => item.followUpInfo && (item.followUpInfo.isOverdue || item.followUpInfo.isDueToday)
  )

  const isLoading = candidatesLoading || trackerLoading

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      {/* Header Banner - Editorial Warmth with Dark Feature Metrics */}
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#1C1B19] text-[#C6A76B] border border-[#C6A76B]/30 text-[10px] font-semibold uppercase tracking-wider mb-2.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C6A76B]" />
              <span>Networking Pipeline &amp; Spacing Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-light text-[#292722] tracking-tight">
              Networking Pipeline Tracker
            </h2>
            <p className="text-xs sm:text-sm text-[#73685B] mt-1 max-w-xl font-normal leading-relaxed">
              Track 7 pipeline stages from invite to established relationship. In-app follow-up reminders enforce +4d and +10d spacing to build authentic rapport.
            </p>
          </div>

          {/* Pipeline Metric Cards - Dark Graphite Feature Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-[#1C1B19] border border-[#514435] rounded-xl px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#FAF7F2]/60">
                <span>In Pipeline</span>
                <Users className="w-3.5 h-3.5 text-[#C6A76B]" />
              </div>
              <div className="text-xl font-bold text-[#FAF7F2] font-mono mt-1">{totalInPipeline}</div>
            </div>

            <div className="bg-[#1C1B19] border border-[#514435] rounded-xl px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#FAF7F2]/60">
                <span>Sent</span>
                <Send className="w-3.5 h-3.5 text-[#C6A76B]" />
              </div>
              <div className="text-xl font-bold text-[#C6A76B] font-mono mt-1">{sentCount}</div>
            </div>

            <div className="bg-[#1C1B19] border border-[#514435] rounded-xl px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#FAF7F2]/60">
                <span>Connected</span>
                <UserCheck className="w-3.5 h-3.5 text-[#2E5A36]" />
              </div>
              <div className="text-xl font-bold text-[#FAF7F2] font-mono mt-1">{connectedCount}</div>
            </div>

            <div className="bg-[#1C1B19] border border-[#514435] rounded-xl px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#FAF7F2]/60">
                <span>Follow-Ups Due</span>
                <Clock className="w-3.5 h-3.5 text-[#942F2F]" />
              </div>
              <div className="text-xl font-bold text-[#942F2F] font-mono mt-1">{followUpsDueCount}</div>
            </div>
          </div>
        </div>

        {/* Notifications Guidance Alert */}
        <div className="mt-4 p-3.5 rounded-md bg-[#FAF7F2] border border-[#D9CFC2] flex items-start space-x-3 text-[#73685B] text-xs">
          <Info className="w-4 h-4 text-[#B49A7D] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-[#292722]">In-App Follow-Up Reminder Notice:</span>
            <p className="text-[#73685B] leading-relaxed">
              Follow-up reminders are tracked in-app and rendered live on this dashboard. No background OS notifications or emails are dispatched when the application is closed.
            </p>
          </div>
        </div>

        {successBanner && (
          <div className="mt-4 p-3.5 rounded-md bg-[#EAF2EC] border border-[#C6DEC9] flex items-center space-x-3 text-[#2E5A36] text-xs sm:text-sm">
            <Check className="w-4 h-4 text-[#2E5A36] shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-md bg-[#FCEEEE] border border-[#F0C4C4] flex items-center space-x-3 text-[#942F2F] text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-[#942F2F] shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Urgent In-App Follow-Up Action Box */}
      {urgentFollowUps.length > 0 && (
        <div className="bg-[#FBF4E8] border border-[#E8D5B5] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarClock className="w-4 h-4 text-[#8A5A20]" />
              <h3 className="text-sm font-semibold text-[#8A5A20] tracking-tight">
                Follow-Ups Due for Action ({urgentFollowUps.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#73685B]">
              Spaced continuity per <code className="bg-[#FAF7F2] border border-[#E8D5B5] px-1 py-0.5 rounded text-[#8A5A20]">li-dm</code>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentFollowUps.map(({ candidate, followUpInfo }) => (
              <div
                key={candidate.id}
                className="bg-[#FAF7F2] border border-[#E8D5B5] rounded-md p-3.5 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-[#292722] text-xs truncate">
                      {candidate.full_name}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                        followUpInfo?.isOverdue
                          ? 'bg-[#FCEEEE] text-[#942F2F] border border-[#F0C4C4]'
                          : 'bg-[#FBF4E8] text-[#8A5A20] border border-[#E8D5B5]'
                      }`}
                    >
                      {followUpInfo?.isOverdue ? `Overdue by ${Math.abs(followUpInfo.days)}d` : 'Due Today'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#73685B] truncate mt-0.5">
                    {candidate.current_company || candidate.headline}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#D9CFC2]">
                  {onNavigateToOutreach && (
                    <button
                      type="button"
                      onClick={() => onNavigateToOutreach(candidate.id)}
                      className="text-xs text-[#292722] hover:text-[#B49A7D] font-medium inline-flex items-center"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      View Draft #2
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStageChange(candidate, 'conversation_active')}
                    className="text-[11px] bg-[#E8DFD3] hover:bg-[#D9CFC2] text-[#292722] px-2 py-1 rounded"
                  >
                    Mark Replied
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Pipeline Station & Filter Header */}
      <div className="space-y-4">
        {/* Stage Filter Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#D9CFC2] pb-3">
          <button
            type="button"
            onClick={() => {
              setFilterStage('all')
              setFilterFollowUpOnly(false)
            }}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStage === 'all' && !filterFollowUpOnly
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#73685B] hover:text-[#292722]'
            }`}
          >
            All Pipeline ({totalInPipeline})
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStage('ready_to_send')
              setFilterFollowUpOnly(false)
            }}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStage === 'ready_to_send'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#73685B] hover:text-[#292722]'
            }`}
          >
            Approved ({pipelineItems.filter((i) => i.tracker.status === 'ready_to_send').length})
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStage('invitation_sent')
              setFilterFollowUpOnly(false)
            }}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStage === 'invitation_sent'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#73685B] hover:text-[#292722]'
            }`}
          >
            Invite Sent ({sentCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStage('connected')
              setFilterFollowUpOnly(false)
            }}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStage === 'connected'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#73685B] hover:text-[#292722]'
            }`}
          >
            Connected ({connectedCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStage('conversation_active')
              setFilterFollowUpOnly(false)
            }}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStage === 'conversation_active'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#73685B] hover:text-[#292722]'
            }`}
          >
            Active Chat ({repliesCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterFollowUpOnly(true)
              setFilterStage('all')
            }}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterFollowUpOnly
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#942F2F] hover:text-[#292722]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Follow-Ups Due ({followUpsDueCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#73685B] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate, role, company or notes..."
            className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
          />
        </div>

        {/* Pipeline List */}
        {isLoading ? (
          <div className="p-12 text-center bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin text-[#292722] mx-auto mb-2" />
            <p className="text-xs uppercase tracking-wider text-[#73685B]">Loading networking pipeline...</p>
          </div>
        ) : approvedCandidates.length === 0 ? (
          <div className="p-12 text-center bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg space-y-4">
            <Users className="w-10 h-10 text-[#B49A7D] mx-auto" />
            <h3 className="text-sm font-semibold text-[#292722]">Your pipeline is empty</h3>
            <p className="text-xs text-[#73685B] max-w-md mx-auto leading-relaxed">
              Candidates must be reviewed and approved in Candidate Curation to enter the Networking Pipeline.
            </p>
            {onNavigateToCuration && (
              <button
                type="button"
                onClick={onNavigateToCuration}
                className="inline-flex items-center px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md transition-colors"
              >
                Go to Candidate Curation
              </button>
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg space-y-2">
            <Filter className="w-8 h-8 text-[#B49A7D] mx-auto" />
            <h4 className="text-sm font-semibold text-[#292722]">No candidates in this view</h4>
            <p className="text-xs text-[#73685B]">Try switching your stage filter or clearing your search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map(({ candidate, tracker, followUpInfo }) => {
              const currentStage = STAGE_CONFIGS[tracker.status] || STAGE_CONFIGS.ready_to_send
              const isUpdatingThis = updatingId === candidate.id
              const isEditingNotes = editingNotesId === candidate.id

              return (
                <div
                  key={candidate.id}
                  className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-5 hover:border-[#B49A7D] transition-colors space-y-4"
                >
                  {/* Top Candidate & Stage Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-[#292722] tracking-tight">
                          {candidate.full_name}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-[#E8DFD3] text-[#292722] border-[#D9CFC2]">
                          {currentStage.label}
                        </span>
                        {followUpInfo && (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                              followUpInfo.isOverdue
                                ? 'bg-[#FCEEEE] text-[#942F2F] border border-[#F0C4C4]'
                                : followUpInfo.isDueToday
                                ? 'bg-[#FBF4E8] text-[#8A5A20] border border-[#E8D5B5]'
                                : 'bg-[#E8DFD3] text-[#73685B] border border-[#D9CFC2]'
                            }`}
                          >
                            {followUpInfo.isOverdue
                              ? `Follow-up overdue (${Math.abs(followUpInfo.days)}d)`
                              : followUpInfo.isDueToday
                              ? 'Follow-up due today'
                              : `Follow-up in ${followUpInfo.days}d`}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#73685B] line-clamp-1">{candidate.headline}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#73685B] pt-0.5">
                        {candidate.current_company && (
                          <span className="flex items-center">
                            <Building2 className="w-3 h-3 mr-1 text-[#B49A7D]" />
                            {candidate.current_company}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-[#73685B]">
                          Match: {candidate.match_score}%
                        </span>
                      </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {onNavigateToOutreach && (
                        <button
                          type="button"
                          onClick={() => onNavigateToOutreach(candidate.id)}
                          className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] text-xs font-medium border border-[#D9CFC2] transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1 text-[#B49A7D]" />
                          <span>Outreach Drafts</span>
                        </button>
                      )}

                      <a
                        href={candidate.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] text-xs font-medium border border-[#D9CFC2] transition-colors"
                        title="Open profile on LinkedIn safely in a new tab"
                      >
                        <span>Profile</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    </div>
                  </div>

                  {/* Stage Progress Bar / Quick Stage Selectors */}
                  <div className="pt-2 border-t border-[#D9CFC2] space-y-2">
                    <span className="text-[11px] font-semibold text-[#73685B] uppercase tracking-wider block">
                      Pipeline Stage:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          'ready_to_send',
                          'invitation_sent',
                          'connected',
                          'conversation_active',
                          'relationship_established',
                          'declined_or_inactive',
                        ] as TrackerStatus[]
                      ).map((stageKey) => {
                        const cfg = STAGE_CONFIGS[stageKey]
                        const isCurrent = tracker.status === stageKey

                        return (
                          <button
                            key={stageKey}
                            type="button"
                            disabled={isUpdatingThis}
                            onClick={() => handleStageChange(candidate, stageKey)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                              isCurrent
                                ? 'bg-[#292722] text-[#FAF7F2]'
                                : 'bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#73685B] hover:text-[#292722] border border-[#D9CFC2]'
                            } disabled:opacity-50`}
                          >
                            {cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Date Logging & Spaced Follow-Up Controller */}
                  <div className="pt-2 border-t border-[#D9CFC2] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Dates Logged */}
                    <div className="space-y-1.5 text-[#73685B]">
                      <div className="flex items-center space-x-2">
                        <Send className="w-3 h-3 text-[#B49A7D]" />
                        <span>Invitation Sent:</span>
                        <strong className="text-[#292722] font-mono">
                          {tracker.invitation_sent_at
                            ? new Date(tracker.invitation_sent_at).toLocaleDateString()
                            : 'Not yet recorded'}
                        </strong>
                      </div>

                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3 h-3 text-[#2E5A36]" />
                        <span>Connected At:</span>
                        <strong className="text-[#292722] font-mono">
                          {tracker.connected_at
                            ? new Date(tracker.connected_at).toLocaleDateString()
                            : 'Not yet connected'}
                        </strong>
                      </div>
                    </div>

                    {/* Next Follow-Up Controller */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[#73685B] flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-[#B49A7D]" />
                          Next Follow-Up Due:
                        </label>
                        {tracker.next_follow_up_date && (
                          <span className="font-mono text-[#292722] text-[11px]">
                            {tracker.next_follow_up_date}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="date"
                          value={tracker.next_follow_up_date || ''}
                          onChange={(e) =>
                            updateTracker(candidate.id, { next_follow_up_date: e.target.value || null })
                          }
                          className="px-2.5 py-1 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D] font-mono"
                        />

                        {/* Quick Spacing Buttons per li-dm */}
                        <button
                          type="button"
                          onClick={() => handleSetQuickDate(candidate.id, 4)}
                          className="px-2 py-1 bg-[#E8DFD3] hover:bg-[#D9CFC2] text-[#292722] rounded text-[11px] font-mono transition-colors"
                          title="Set follow-up in +4 days"
                        >
                          +4d
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetQuickDate(candidate.id, 10)}
                          className="px-2 py-1 bg-[#E8DFD3] hover:bg-[#D9CFC2] text-[#292722] rounded text-[11px] font-mono transition-colors"
                          title="Set follow-up in +10 days"
                        >
                          +10d
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="pt-2 border-t border-[#D9CFC2] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#73685B] uppercase tracking-wider flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        Conversation Notes:
                      </span>
                      {!isEditingNotes && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNotesId(candidate.id)
                            setNotesInput(tracker.notes || '')
                          }}
                          className="text-[11px] text-[#292722] hover:text-[#B49A7D] hover:underline font-medium"
                        >
                          {tracker.notes ? 'Edit Notes' : '+ Add Note'}
                        </button>
                      )}
                    </div>

                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="e.g. Chatting about PyTorch inference; promised to share GitHub benchmark..."
                          className="w-full p-2.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#73685B] text-xs rounded-md border border-[#D9CFC2]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(candidate.id)}
                            className="px-3 py-1 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : tracker.notes ? (
                      <p className="text-xs text-[#292722] bg-[#FAF7F2] p-2.5 rounded-md border border-[#D9CFC2] leading-relaxed">
                        {tracker.notes}
                      </p>
                    ) : (
                      <span className="text-[11px] text-[#73685B] italic block">
                        No conversation notes recorded yet.
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
