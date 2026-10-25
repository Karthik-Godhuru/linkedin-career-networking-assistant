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
    const updates: Partial<NetworkingTrackerRecord> = { status: newStatus }

    // Auto-stamp dates if transitioning
    if (newStatus === 'invitation_sent' && !current?.invitation_sent_at) {
      updates.invitation_sent_at = getNowIsoString()
      // Suggest +4 days for 1st follow-up per li-dm
      updates.next_follow_up_date = getFutureDateString(4)
    } else if (newStatus === 'connected' && !current?.connected_at) {
      updates.connected_at = getNowIsoString()
      updates.next_follow_up_date = getFutureDateString(4)
    }

    const res = await updateTracker(candidate.id, updates)
    if (res.success) {
      setSuccessBanner(`Updated ${candidate.full_name} to "${STAGE_CONFIGS[newStatus].label}"`)
      setTimeout(() => setSuccessBanner(null), 3000)
    }
  }

  const handleSetQuickDate = async (candidateId: string, daysAhead: number) => {
    const dateStr = getFutureDateString(daysAhead)
    const res = await updateTracker(candidateId, { next_follow_up_date: dateStr })
    if (res.success) {
      setSuccessBanner(`Follow-up set to ${dateStr} (+${daysAhead} days)`)
      setTimeout(() => setSuccessBanner(null), 3000)
    }
  }

  const handleSaveNotes = async (candidateId: string) => {
    const res = await updateTracker(candidateId, { notes: notesInput })
    if (res.success) {
      setEditingNotesId(null)
      setSuccessBanner('Notes updated successfully')
      setTimeout(() => setSuccessBanner(null), 2500)
    }
  }

  // Filter items
  const filteredItems = pipelineItems.filter((item) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      !searchTerm ||
      item.candidate.full_name.toLowerCase().includes(q) ||
      (item.candidate.headline || '').toLowerCase().includes(q) ||
      (item.candidate.current_company || '').toLowerCase().includes(q) ||
      (item.tracker.notes || '').toLowerCase().includes(q)

    const matchesStage = filterStage === 'all' || item.tracker.status === filterStage
    const matchesFollowUp =
      !filterFollowUpOnly ||
      item.tracker.status === 'follow_up_due' ||
      (item.followUpInfo && (item.followUpInfo.isOverdue || item.followUpInfo.isDueToday))

    return matchesSearch && matchesStage && matchesFollowUp
  })

  // Urgent Follow-Ups list
  const urgentFollowUps = pipelineItems.filter(
    (item) => item.followUpInfo && (item.followUpInfo.isOverdue || item.followUpInfo.isDueToday)
  )

  const isLoading = candidatesLoading || trackerLoading

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      {/* Top Banner with Pipeline Metrics */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Milestone 6 &bull; Networking Pipeline & Follow-Up Studio</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Networking Pipeline & Follow-Up Reminders
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Track candidates from invitation to accepted connection and meaningful conversation. Maintain spaced follow-ups without automated bot sequences.
            </p>
          </div>

          {/* Pipeline Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>In Pipeline</span>
                <Users className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{totalInPipeline}</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Sent (Pending)</span>
                <Send className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">{sentCount}</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Connected</span>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">{connectedCount}</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Follow-Ups Due</span>
                <Clock className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-lg font-bold text-rose-300 font-mono mt-0.5">{followUpsDueCount}</div>
            </div>
          </div>
        </div>

        {/* Notifications Guidance Alert */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start space-x-3 text-slate-300 text-xs">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-white">In-App Follow-Up Reminder Notice:</span>
            <p className="text-slate-400 leading-relaxed">
              Follow-up reminders are tracked in-app and rendered live on this dashboard. No background OS notifications or emails are dispatched when the application is closed.
            </p>
          </div>
        </div>

        {successBanner && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 flex items-center space-x-3 text-emerald-200 text-xs sm:text-sm animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 flex items-center space-x-3 text-red-200 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Urgent In-App Follow-Up Action Box */}
      {urgentFollowUps.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarClock className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-rose-200 tracking-tight">
                Follow-Ups Due for Action ({urgentFollowUps.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-rose-300">
              Spaced continuity per <code className="bg-rose-950/90 px-1 py-0.5 rounded">li-dm</code>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentFollowUps.map(({ candidate, followUpInfo }) => (
              <div
                key={candidate.id}
                className="bg-slate-900/90 border border-rose-900/50 rounded-xl p-3.5 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white text-xs truncate">
                      {candidate.full_name}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                        followUpInfo?.isOverdue
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {followUpInfo?.isOverdue ? `Overdue by ${Math.abs(followUpInfo.days)}d` : 'Due Today'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {candidate.current_company || candidate.headline}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  {onNavigateToOutreach && (
                    <button
                      type="button"
                      onClick={() => onNavigateToOutreach(candidate.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      View Draft #2
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStageChange(candidate, 'conversation_active')}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded-lg"
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
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => {
              setFilterStage('all')
              setFilterFollowUpOnly(false)
            }}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterStage === 'all' && !filterFollowUpOnly
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
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
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterStage === 'ready_to_send'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
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
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterStage === 'invitation_sent'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
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
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterStage === 'connected'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
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
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterStage === 'conversation_active'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
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
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterFollowUpOnly
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-rose-300 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Follow-Ups Due ({followUpsDueCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate, role, company or notes..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Pipeline List */}
        {isLoading ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading networking pipeline...</p>
          </div>
        ) : approvedCandidates.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-white">Your pipeline is empty</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Candidates must be reviewed and approved in Candidate Curation (M4) to enter the Networking Pipeline.
            </p>
            {onNavigateToCuration && (
              <button
                type="button"
                onClick={onNavigateToCuration}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                Go to Candidate Curation (M4)
              </button>
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <Filter className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-white">No candidates in this view</h4>
            <p className="text-xs text-slate-400">Try switching your stage filter or clearing your search.</p>
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
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all space-y-4"
                >
                  {/* Top Candidate & Stage Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-white tracking-tight">
                          {candidate.full_name}
                        </h4>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${currentStage.badgeColor}`}>
                          {currentStage.label}
                        </span>
                        {followUpInfo && (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                              followUpInfo.isOverdue
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : followUpInfo.isDueToday
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-950 text-slate-400 border border-slate-800'
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

                      <p className="text-xs text-slate-300 line-clamp-1">{candidate.headline}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                        {candidate.current_company && (
                          <span className="flex items-center">
                            <Building2 className="w-3 h-3 mr-1 text-slate-500" />
                            {candidate.current_company}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-slate-500">
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
                          className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs font-medium border border-slate-700 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          <span>Outreach Drafts</span>
                        </button>
                      )}

                      <a
                        href={candidate.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
                        title="Open profile on LinkedIn safely in a new tab"
                      >
                        <span>Profile</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    </div>
                  </div>

                  {/* Stage Progress Bar / Quick Stage Selectors */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
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
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                              isCurrent
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                            } disabled:opacity-50`}
                          >
                            {cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Date Logging & Spaced Follow-Up Controller */}
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Dates Logged */}
                    <div className="space-y-1.5 text-slate-400">
                      <div className="flex items-center space-x-2">
                        <Send className="w-3 h-3 text-slate-500" />
                        <span>Invitation Sent:</span>
                        <strong className="text-white font-mono">
                          {tracker.invitation_sent_at
                            ? new Date(tracker.invitation_sent_at).toLocaleDateString()
                            : 'Not yet recorded'}
                        </strong>
                      </div>

                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3 h-3 text-slate-500" />
                        <span>Connected At:</span>
                        <strong className="text-white font-mono">
                          {tracker.connected_at
                            ? new Date(tracker.connected_at).toLocaleDateString()
                            : 'Not yet connected'}
                        </strong>
                      </div>
                    </div>

                    {/* Next Follow-Up Controller */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-400 flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-slate-500" />
                          Next Follow-Up Due:
                        </label>
                        {tracker.next_follow_up_date && (
                          <span className="font-mono text-white text-[11px]">
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
                          className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                        />

                        {/* Quick Spacing Buttons per li-dm */}
                        <button
                          type="button"
                          onClick={() => handleSetQuickDate(candidate.id, 4)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-mono"
                          title="Set follow-up in +4 days (First follow-up per li-dm)"
                        >
                          +4d
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetQuickDate(candidate.id, 10)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-mono"
                          title="Set follow-up in +10 days (Close the loop per li-dm)"
                        >
                          +10d
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
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
                          className="text-[11px] text-blue-400 hover:underline"
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
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(candidate.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : tracker.notes ? (
                      <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/60 leading-relaxed font-sans">
                        {tracker.notes}
                      </p>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic block">
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
