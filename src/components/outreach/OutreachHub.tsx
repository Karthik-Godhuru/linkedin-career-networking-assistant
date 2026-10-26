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
    const updatedDrafts: OutreachDrafts = {
      ...drafts,
      inviteNote: drafts.inviteNote,
      followUp1: editedFollowUp1,
      followUp2: editedFollowUp2,
      characterCount: editedInviteNote.length,
      tone,
    }
    const res = await onSave(candidate.id, updatedDrafts, editedInviteNote)
    if (res.success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3500)
    }
  }

  const charCount = editedInviteNote.length
  const isOverHardLimit = charCount > 300
  const isOverFreeLimit = charCount > 200

  return (
    <div className="space-y-6 text-left">
      {/* Candidate Focus Header */}
      <div className="p-5 rounded-lg bg-[#FAF7F2] border border-[#D9CFC2] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-[#292722]">{candidate.full_name}</h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#E8DFD3] text-[#292722] border border-[#D9CFC2]">
                {candidate.match_score}% Match
              </span>
            </div>
            <p className="text-xs text-[#73685B] mt-0.5">{candidate.headline}</p>
          </div>

          <a
            href={candidate.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center text-xs font-medium text-[#292722] hover:text-[#B49A7D] hover:underline"
          >
            <span>View LinkedIn Profile</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#73685B] pt-2 border-t border-[#D9CFC2]">
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
          <div className="flex items-center space-x-1 text-[#2E5A36] font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hook: {drafts.hookReason}</span>
          </div>
        </div>
      </div>

      {/* Tone & Context Generator Controls */}
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#292722] mb-1.5">
            Communication Style &amp; Tone
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                id: 'professional_warm' as OutreachTone,
                label: 'Professional & Warm',
                sub: 'Polite, clear, respectful',
              },
              {
                id: 'alumni_peer' as OutreachTone,
                label: 'Peer / Alumni',
                sub: 'Collegial, common ground',
              },
              {
                id: 'founder_direct' as OutreachTone,
                label: 'Direct & Concise',
                sub: 'High-signal, compact',
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToneChange(t.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tone === t.id
                    ? 'bg-[#1C1B19] border-[#C6A76B]/50 text-[#FAF7F2] shadow-sm'
                    : 'bg-[#FAF7F2] border-[#D9CFC2] text-[#73685B] hover:text-[#292722] hover:bg-[#E8DFD3]'
                }`}
              >
                <div className={`text-xs font-semibold ${tone === t.id ? 'text-[#C6A76B]' : 'text-[#292722]'}`}>
                  {t.label}
                </div>
                <div className={`text-[10px] mt-0.5 ${tone === t.id ? 'text-[#FAF7F2]/80' : 'text-[#73685B]'}`}>
                  {t.sub}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#292722] mb-1.5">
            Add Specific Personal Context (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="e.g. Read your post on vLLM paged attention; enjoyed your talk at AI Summit"
              className="flex-1 px-3.5 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#292722]"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 bg-[#1C1B19] hover:bg-[#292722] text-[#FAF7F2] border border-[#C6A76B]/40 text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-[#C6A76B]" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-[#C6A76B]" />
                  Regenerate Drafts
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-md bg-[#EAF2EC] border border-[#C6DEC9] flex items-center space-x-3 text-[#2E5A36] text-xs sm:text-sm">
          <Check className="w-4 h-4 text-[#2E5A36] shrink-0" />
          <span>Outreach drafts saved to your private database profile!</span>
        </div>
      )}

      {/* Draft 1: LinkedIn Connection Invite Note */}
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-[#292722] flex items-center space-x-2">
              <span>1. LinkedIn Connection Note</span>
              <span className="text-[11px] font-mono text-[#73685B] font-normal">
                (Sent with invite)
              </span>
            </h4>
            <p className="text-[11px] text-[#73685B] mt-0.5">
              Formula: Specific reference + one-line identity + zero pitch.
            </p>
          </div>

          {/* Character Counter Pill */}
          <div
            className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-md border ${
              isOverHardLimit
                ? 'bg-[#FCEEEE] text-[#942F2F] border-[#F0C4C4]'
                : isOverFreeLimit
                ? 'bg-[#FBF4E8] text-[#8A5A20] border-[#E8D5B5]'
                : 'bg-[#EAF2EC] text-[#2E5A36] border-[#C6DEC9]'
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
          className="w-full p-3 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs sm:text-sm text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D] focus:ring-1 focus:ring-[#B49A7D] leading-relaxed"
        />

        {isOverHardLimit && (
          <p className="text-[11px] text-[#942F2F] flex items-center">
            <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
            Exceeds LinkedIn maximum character length (300 characters). Please trim.
          </p>
        )}
        {isOverFreeLimit && !isOverHardLimit && (
          <p className="text-[11px] text-[#8A5A20] flex items-center">
            <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
            Over 200 characters. Recommended: stay under 200 for reliable mobile display.
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[#73685B]">
            Always review and verify before copying.
          </span>

          <button
            type="button"
            onClick={() => handleCopy(editedInviteNote, 'invite')}
            className="inline-flex items-center px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] text-xs font-medium rounded-md border border-[#D9CFC2] transition-colors"
          >
            {copiedKey === 'invite' ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-[#2E5A36]" />
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
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-[#292722] flex items-center space-x-2">
              <span>2. First Direct Message (+4 Days)</span>
              <span className="text-[11px] font-mono text-[#2E5A36] font-normal">
                (After connection is accepted)
              </span>
            </h4>
            <p className="text-[11px] text-[#73685B] mt-0.5">
              Continuity with note. Gives an open-source artifact or paper before asking for a 15-minute chat.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#73685B]">
            <Clock className="w-3 h-3 inline mr-1" />
            Day +4
          </span>
        </div>

        <textarea
          rows={3}
          value={editedFollowUp1}
          onChange={(e) => setEditedFollowUp1(e.target.value)}
          placeholder="First follow-up message..."
          className="w-full p-3 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs sm:text-sm text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D] focus:ring-1 focus:ring-[#B49A7D] leading-relaxed"
        />

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => handleCopy(editedFollowUp1, 'fu1')}
            className="inline-flex items-center px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] text-xs font-medium rounded-md border border-[#D9CFC2] transition-colors"
          >
            {copiedKey === 'fu1' ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-[#2E5A36]" />
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
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-[#292722] flex items-center space-x-2">
              <span>3. Final Follow-Up (+10 Days)</span>
              <span className="text-[11px] font-mono text-[#8A5A20] font-normal">
                (Close the loop)
              </span>
            </h4>
            <p className="text-[11px] text-[#73685B] mt-0.5">
              Acknowledges busy schedule, removes all pressure, politely closes the loop.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#73685B]">
            <Clock className="w-3 h-3 inline mr-1" />
            Day +10
          </span>
        </div>

        <textarea
          rows={2}
          value={editedFollowUp2}
          onChange={(e) => setEditedFollowUp2(e.target.value)}
          placeholder="Final follow-up message..."
          className="w-full p-3 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs sm:text-sm text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D] focus:ring-1 focus:ring-[#B49A7D] leading-relaxed"
        />

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => handleCopy(editedFollowUp2, 'fu2')}
            className="inline-flex items-center px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] text-xs font-medium rounded-md border border-[#D9CFC2] transition-colors"
          >
            {copiedKey === 'fu2' ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-[#2E5A36]" />
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
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-[#73685B]">
          <span>Persists your customized drafts to Supabase </span>
          <code className="text-[#292722] font-mono bg-[#E8DFD3] px-1.5 py-0.5 rounded">connection_messages</code>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={Boolean(savingId) || isOverHardLimit}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md transition-colors disabled:opacity-50"
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
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded bg-[#E8DFD3] text-[#73685B] border border-[#D9CFC2] text-xs font-medium uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-[#B49A7D]" />
              <span>Personalized Outreach Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-light text-[#292722] tracking-tight">
              Connection Message &amp; Follow-Up Studio
            </h2>
            <p className="text-xs sm:text-sm text-[#73685B] mt-1 max-w-xl font-normal leading-relaxed">
              Strictly grounded in verified profile facts and <code className="text-[#292722] bg-[#E8DFD3] px-1.5 py-0.5 rounded">li-dm</code> rules: under 200 characters, no sales funnels, and two thoughtful follow-ups.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md px-4 py-3 shrink-0">
            <Send className="w-5 h-5 text-[#2E5A36]" />
            <div>
              <div className="text-xs text-[#73685B]">Approved for Outreach</div>
              <div className="text-base font-bold text-[#292722] font-mono">
                {approvedCandidates.length}
              </div>
            </div>
          </div>
        </div>

        {/* Informational Guidance Alert */}
        <div className="mt-4 p-3.5 rounded-md bg-[#FAF7F2] border border-[#D9CFC2] flex items-start space-x-3 text-[#73685B] text-xs">
          <Info className="w-4 h-4 text-[#B49A7D] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#292722]">LinkedIn Terms Compliance Guarantee:</span>
            <p className="text-[#73685B] leading-relaxed">
              This application never clicks Connect, never sends automated messages, and never uses browser bots. You copy each message and send it manually through your personal browser tab.
            </p>
          </div>
        </div>

        {messageError && (
          <div className="mt-4 p-3.5 rounded-md bg-[#FCEEEE] border border-[#F0C4C4] flex items-center space-x-3 text-[#942F2F] text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-[#942F2F] shrink-0" />
            <span>{messageError}</span>
          </div>
        )}
      </div>

      {/* Main Studio Grid */}
      {candidatesLoading ? (
        <div className="p-12 text-center bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-[#292722] mx-auto mb-2" />
          <p className="text-xs uppercase tracking-wider text-[#73685B]">Loading approved candidates...</p>
        </div>
      ) : approvedCandidates.length === 0 ? (
        <div className="p-12 text-center bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg space-y-4">
          <MessageSquare className="w-10 h-10 text-[#B49A7D] mx-auto" />
          <h3 className="text-sm font-semibold text-[#292722]">No candidates approved for outreach yet</h3>
          <p className="text-xs text-[#73685B] max-w-md mx-auto leading-relaxed">
            Candidates must be reviewed and approved in the Curation Dashboard before generating outreach drafts.
          </p>
          {onNavigateToCuration && (
            <button
              type="button"
              onClick={onNavigateToCuration}
              className="inline-flex items-center px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md transition-colors"
            >
              Open Candidate Curation
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Approved Candidate Selector */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#73685B] px-1">
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
                    className={`w-full text-left p-3.5 rounded-md border transition-colors ${
                      isSelected
                        ? 'bg-[#FAF7F2] border-[#292722] shadow-sm'
                        : 'bg-[#FAF7F2] border-[#D9CFC2] hover:border-[#B49A7D] hover:bg-[#E8DFD3]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-[#292722] text-xs sm:text-sm truncate">
                        {cand.full_name}
                      </div>
                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EAF2EC] text-[#2E5A36] border border-[#C6DEC9]">
                        {cand.match_score}%
                      </span>
                    </div>

                    <p className="text-[#73685B] text-[11px] truncate mt-0.5">
                      {cand.headline || 'Software Professional'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-[#73685B] mt-2 pt-2 border-t border-[#D9CFC2]">
                      <span>{cand.current_company || 'Independent'}</span>
                      {hasSavedMsg && (
                        <span className="text-[#2E5A36] flex items-center font-medium">
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
