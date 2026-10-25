import React, { useState } from 'react'
import {
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Save,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  Building2,
  MapPin,
  Clock,
  Send,
  Loader2,
  Info,
} from 'lucide-react'
import { useCandidates } from '../../hooks/useCandidates'
import { useCareerProfile } from '../../hooks/useCareerProfile'
import { useOutreachMessages } from '../../hooks/useOutreachMessages'
import { generateOutreachDrafts, generateGeminiOutreach } from '../../services/outreachEngine'
import type { CandidateRecord } from '../../types/candidate'
import type { CareerProfileFormData } from '../../types/profile'
import type { OutreachDrafts, OutreachTone, ConnectionMessageRecord } from '../../types/outreach'

interface OutreachHubProps {
  initialCandidateId?: string | null
  onNavigateToCuration?: () => void
}

interface DraftEditorProps {
  candidate: CandidateRecord
  savedMessage?: ConnectionMessageRecord
  userProfile: CareerProfileFormData
  savingId: string | null
  onSave: (candidateId: string, drafts: OutreachDrafts, userEditedNote?: string) => Promise<{ success: boolean; error?: string }>
}

const CandidateDraftEditor: React.FC<DraftEditorProps> = ({
  candidate,
  savedMessage,
  userProfile,
  savingId,
  onSave,
}) => {
  const initialDrafts: OutreachDrafts = savedMessage
    ? {
        inviteNote: savedMessage.draft_template,
        characterCount: (savedMessage.user_edited_text || savedMessage.draft_template).length,
        followUp1: savedMessage.follow_up_1 || '',
        followUp2: savedMessage.follow_up_2 || '',
        hookReason: 'Previously saved draft',
        tone: (savedMessage.tone as OutreachTone) || 'professional_warm',
      }
    : generateOutreachDrafts(candidate, userProfile, '', 'professional_warm')

  const [tone, setTone] = useState<OutreachTone>(initialDrafts.tone)
  const [customContext, setCustomContext] = useState<string>('')
  const [drafts, setDrafts] = useState<OutreachDrafts>(initialDrafts)
  const [editedInviteNote, setEditedInviteNote] = useState<string>(
    savedMessage?.user_edited_text || initialDrafts.inviteNote
  )
  const [editedFollowUp1, setEditedFollowUp1] = useState<string>(initialDrafts.followUp1)
  const [editedFollowUp2, setEditedFollowUp2] = useState<string>(initialDrafts.followUp2)
  const [generating, setGenerating] = useState<boolean>(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)

  const handleGenerate = async () => {
    setGenerating(true)
    setSaveSuccess(false)

    let newDrafts = await generateGeminiOutreach(candidate, userProfile, customContext)
    if (!newDrafts) {
      newDrafts = generateOutreachDrafts(candidate, userProfile, customContext, tone)
    }

    setDrafts(newDrafts)
    setEditedInviteNote(newDrafts.inviteNote)
    setEditedFollowUp1(newDrafts.followUp1)
    setEditedFollowUp2(newDrafts.followUp2)
    setGenerating(false)
  }

  const handleToneChange = (newTone: OutreachTone) => {
    setTone(newTone)
    const refreshed = generateOutreachDrafts(candidate, userProfile, customContext, newTone)
    setDrafts(refreshed)
    setEditedInviteNote(refreshed.inviteNote)
    setEditedFollowUp1(refreshed.followUp1)
    setEditedFollowUp2(refreshed.followUp2)
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const handleSave = async () => {
    const currentDrafts: OutreachDrafts = {
      ...drafts,
      inviteNote: editedInviteNote,
      characterCount: editedInviteNote.length,
      followUp1: editedFollowUp1,
      followUp2: editedFollowUp2,
      tone,
    }

    const res = await onSave(candidate.id, currentDrafts, editedInviteNote)
    if (res.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3500)
    }
  }

  const charCount = editedInviteNote.length
  const isOverFreeLimit = charCount > 200
  const isOverHardLimit = charCount > 300

  return (
    <div className="space-y-5">
      {/* Selected Candidate Meta Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {candidate.full_name}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">{candidate.headline}</p>
          </div>

          <a
            href={candidate.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs font-medium border border-slate-700 transition-colors shrink-0"
          >
            <span>View LinkedIn Profile</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
          {candidate.current_company && (
            <span className="flex items-center">
              <Building2 className="w-3 h-3 mr-1 text-slate-500" />
              {candidate.current_company}
            </span>
          )}
          {candidate.location && (
            <span className="flex items-center">
              <MapPin className="w-3 h-3 mr-1 text-slate-500" />
              {candidate.location}
            </span>
          )}
          {drafts.hookReason && (
            <span className="text-[11px] text-blue-300 bg-blue-950/70 border border-blue-900 px-2 py-0.5 rounded-full font-mono">
              Hook: {drafts.hookReason}
            </span>
          )}
        </div>

        {/* Generator Controls */}
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Outreach Tone
              </label>
              <select
                value={tone}
                onChange={(e) => handleToneChange(e.target.value as OutreachTone)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="professional_warm">Professional & Warm (Default)</option>
                <option value="peer_technical">Peer Technical (Open Source Focus)</option>
                <option value="alumni_academic">Alumni & Campus Network</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Custom Hook Context <span className="text-slate-500 font-normal">(Optional fact)</span>
              </label>
              <input
                type="text"
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="e.g. Loved your PyTorch blog post on inference"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Regenerate Drafts
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 flex items-center space-x-3 text-emerald-200 text-xs sm:text-sm animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Outreach drafts saved to your private database profile!</span>
        </div>
      )}

      {/* Draft 1: LinkedIn Connection Invite Note */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>1. LinkedIn Connection Note</span>
              <span className="text-[11px] font-mono text-slate-400 font-normal">
                (Sent with invite)
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Formula: Specific reference + one-line identity + zero pitch.
            </p>
          </div>

          {/* Character Counter Pill */}
          <div
            className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              isOverHardLimit
                ? 'bg-red-950 text-red-300 border-red-800'
                : isOverFreeLimit
                ? 'bg-amber-950 text-amber-300 border-amber-800'
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}
          >
            [{charCount}/200]
          </div>
        </div>

        <textarea
          rows={3}
          value={editedInviteNote}
          onChange={(e) => setEditedInviteNote(e.target.value)}
          placeholder="Invite note draft..."
          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
        />

        {isOverHardLimit && (
          <p className="text-[11px] text-red-400 flex items-center">
            <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
            Exceeds LinkedIn maximum character length (300 characters). Please trim.
          </p>
        )}
        {isOverFreeLimit && !isOverHardLimit && (
          <p className="text-[11px] text-amber-400 flex items-center">
            <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
            Over 200 characters. Recommended: stay under 200 for reliable mobile display.
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500">
            Always review and verify before copying.
          </span>

          <button
            type="button"
            onClick={() => handleCopy(editedInviteNote, 'invite')}
            className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            {copiedKey === 'invite' ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Invite Note
              </>
            )}
          </button>
        </div>
      </div>

      {/* Draft 2: Follow-Up #1 (+4 Days) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>2. First Direct Message (+4 Days)</span>
              <span className="text-[11px] font-mono text-emerald-400 font-normal">
                (After connection is accepted)
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Continuity with note. Gives an open-source artifact or paper before asking for a 15-minute chat.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            <Clock className="w-3 h-3 inline mr-1" />
            Day +4
          </span>
        </div>

        <textarea
          rows={3}
          value={editedFollowUp1}
          onChange={(e) => setEditedFollowUp1(e.target.value)}
          placeholder="First follow-up message..."
          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
        />

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => handleCopy(editedFollowUp1, 'fu1')}
            className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            {copiedKey === 'fu1' ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Follow-Up #1
              </>
            )}
          </button>
        </div>
      </div>

      {/* Draft 3: Follow-Up #2 (+10 Days Close the Loop) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>3. Final Follow-Up (+10 Days)</span>
              <span className="text-[11px] font-mono text-amber-400 font-normal">
                (Close the loop)
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Acknowledges busy schedule, removes all pressure, politely closes the loop.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            <Clock className="w-3 h-3 inline mr-1" />
            Day +10
          </span>
        </div>

        <textarea
          rows={2}
          value={editedFollowUp2}
          onChange={(e) => setEditedFollowUp2(e.target.value)}
          placeholder="Final follow-up message..."
          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
        />

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => handleCopy(editedFollowUp2, 'fu2')}
            className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            {copiedKey === 'fu2' ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Follow-Up #2
              </>
            )}
          </button>
        </div>
      </div>

      {/* Master Save Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          <span>Persists your customized drafts to Supabase </span>
          <code className="text-slate-300 font-mono">connection_messages</code>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={Boolean(savingId) || isOverHardLimit}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
        >
          {savingId ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              Saving to Database...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 mr-2" />
              Save Outreach Sequence
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export const OutreachHub: React.FC<OutreachHubProps> = ({
  initialCandidateId,
  onNavigateToCuration,
}) => {
  const { candidates, loading: candidatesLoading } = useCandidates()
  const { profile: userProfile } = useCareerProfile()
  const { messages, savingId, error: messageError, saveOutreachDrafts } = useOutreachMessages()

  const approvedCandidates = candidates.filter((c) => c.status === 'approved')

  const [selectedId, setSelectedId] = useState<string | null>(
    initialCandidateId || null
  )

  // Derived selected candidate
  const currentCandidate =
    approvedCandidates.find((c) => c.id === selectedId) ||
    (approvedCandidates.length > 0 ? approvedCandidates[0] : null)

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      {/* Overview Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Milestone 5 &bull; Personalized Outreach Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Connection Message & Follow-Up Studio
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Strictly grounded in verified profile facts and <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded">li-dm</code> rules: under 200 characters, no sales funnels, and two thoughtful follow-ups.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 shrink-0">
            <Send className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xs text-slate-400">Approved for Outreach</div>
              <div className="text-base font-bold text-white font-mono">
                {approvedCandidates.length}
              </div>
            </div>
          </div>
        </div>

        {/* Informational Guidance Alert */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start space-x-3 text-slate-300 text-xs">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-white">LinkedIn Terms Compliance Guarantee:</span>
            <p className="text-slate-400 leading-relaxed">
              This application never clicks Connect, never sends automated messages, and never uses browser bots. You copy each message and send it manually through your personal browser tab.
            </p>
          </div>
        </div>

        {messageError && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 flex items-center space-x-3 text-red-200 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{messageError}</span>
          </div>
        )}
      </div>

      {/* Main Studio Grid */}
      {candidatesLoading ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading approved candidates...</p>
        </div>
      ) : approvedCandidates.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No candidates approved for outreach yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Candidates must be reviewed and approved in the Curation Dashboard before generating outreach drafts.
          </p>
          {onNavigateToCuration && (
            <button
              type="button"
              onClick={onNavigateToCuration}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              Open Candidate Curation (M4)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Approved Candidate Selector */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Select Approved Candidate ({approvedCandidates.length})
            </h3>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {approvedCandidates.map((cand) => {
                const isSelected = currentCandidate?.id === cand.id
                const hasSavedMsg = Boolean(messages[cand.id])

                return (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => setSelectedId(cand.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-600/80 shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-white text-xs sm:text-sm truncate">
                        {cand.full_name}
                      </div>
                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {cand.match_score}%
                      </span>
                    </div>

                    <p className="text-slate-400 text-[11px] truncate mt-0.5">
                      {cand.headline || 'Software Professional'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
                      <span>{cand.current_company || 'Independent'}</span>
                      {hasSavedMsg && (
                        <span className="text-emerald-400 flex items-center">
                          <Check className="w-2.5 h-2.5 mr-0.5" /> Draft Saved
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Column: Keyed Draft Editor */}
          {currentCandidate && (
            <div className="lg:col-span-8">
              <CandidateDraftEditor
                key={currentCandidate.id}
                candidate={currentCandidate}
                savedMessage={messages[currentCandidate.id]}
                userProfile={userProfile}
                savingId={savingId}
                onSave={saveOutreachDrafts}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
