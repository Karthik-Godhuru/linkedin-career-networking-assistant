import React, { useState } from 'react'
import type { InternshipRecord, InternshipStatus } from '../../types/internship'
import { INTERNSHIP_STAGES } from '../../types/internship'
import {
  ExternalLink,
  Calendar,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit3,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface InternshipCardProps {
  internship: InternshipRecord
  onUpdateStatus: (id: string, newStatus: InternshipStatus) => void
  onUpdateNotes: (id: string, notes: string) => void
  onUpdateDeadline: (id: string, deadline: string) => void
  onDelete: (id: string) => void
  isSaving: boolean
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function isDateWithinDays(targetDate: string, days: number): boolean {
  const diff = new Date(targetDate).getTime() - new Date().getTime()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
}

export const InternshipCard: React.FC<InternshipCardProps> = ({
  internship,
  onUpdateStatus,
  onUpdateNotes,
  onUpdateDeadline,
  onDelete,
  isSaving,
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false)
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false)
  const [notesInput, setNotesInput] = useState<string>(internship.notes || '')
  const [isEditingDeadline, setIsEditingDeadline] = useState<boolean>(false)
  const [deadlineInput, setDeadlineInput] = useState<string>(internship.deadline || '')

  const stage = INTERNSHIP_STAGES[internship.status] || INTERNSHIP_STAGES.discovered

  // Determine deadline urgency
  const today = getTodayString()
  const isOverdue = !!(
    internship.deadline &&
    internship.deadline < today &&
    !['applied', 'offered', 'rejected', 'withdrawn'].includes(internship.status)
  )
  const isUpcoming = !!(
    internship.deadline &&
    internship.deadline >= today &&
    isDateWithinDays(internship.deadline, 7)
  )

  const handleSaveNotes = () => {
    onUpdateNotes(internship.id, notesInput)
    setIsEditingNotes(false)
  }

  const handleSaveDeadline = () => {
    onUpdateDeadline(internship.id, deadlineInput)
    setIsEditingDeadline(false)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm space-y-4">
      {/* Header: Title, Company, Status Badge & Match Score */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">{internship.title}</h3>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${stage.badgeColor}`}>
              {stage.label}
            </span>
            {internship.source === 'sample_dataset' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">
                Sample Opportunity
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center text-slate-300 font-medium">
              <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {internship.company}
            </span>
            {internship.location && (
              <span className="inline-flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                {internship.location}
              </span>
            )}
            <span className="inline-flex items-center capitalize text-slate-400">
              Mode: <strong className="ml-1 text-slate-300">{internship.work_mode || 'onsite'}</strong>
            </span>
          </div>
        </div>

        {/* Match Score Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div
            className={`px-3 py-1.5 rounded-xl border text-center ${
              (internship.match_score ?? 0) >= 80
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                : (internship.match_score ?? 0) >= 60
                ? 'bg-blue-950/80 border-blue-800 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Match</div>
            <div className="text-lg font-bold leading-tight">{internship.match_score ?? 50}%</div>
          </div>
        </div>
      </div>

      {/* Deadlines & Dates bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {internship.deadline ? (
            <div
              className={`inline-flex items-center px-2.5 py-1 rounded-lg border font-medium ${
                isOverdue
                  ? 'bg-rose-950/90 text-rose-300 border-rose-800'
                  : isUpcoming
                  ? 'bg-amber-950/90 text-amber-300 border-amber-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              <span>Deadline: {internship.deadline}</span>
              {isOverdue && <span className="ml-1.5 font-bold uppercase text-[10px]">(Overdue)</span>}
              {isUpcoming && <span className="ml-1.5 font-bold uppercase text-[10px]">(Due Soon)</span>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingDeadline(true)}
              className="inline-flex items-center text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              + Add Deadline
            </button>
          )}

          {internship.applied_at && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-900/50">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Applied: {new Date(internship.applied_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Quick Official Link */}
        <a
          href={internship.posting_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
        >
          <span>Official Application Portal</span>
          <ExternalLink className="w-3.5 h-3.5 ml-1" />
        </a>
      </div>

      {/* Deadline inline edit */}
      {isEditingDeadline && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <input
            type="date"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
            className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200"
          />
          <button
            type="button"
            onClick={handleSaveDeadline}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditingDeadline(false)}
            className="px-2.5 py-1 text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Skills: Required & Missing */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Required:</span>
          {internship.required_skills && internship.required_skills.length > 0 ? (
            internship.required_skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-slate-500 italic">General engineering criteria</span>
          )}
        </div>

        {internship.missing_skills && internship.missing_skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center pt-1">
            <span className="text-[11px] text-amber-400 font-medium mr-1 flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Skills to Highlight / Develop:
            </span>
            {internship.missing_skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/60"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Transparent Match Reasons (Accordion) */}
      <div className="border-t border-slate-800/80 pt-2">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
        >
          <span className="inline-flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            <span>Why this opportunity matches your career goals</span>
          </span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDetails && (
          <div className="mt-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2 text-xs">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Transparent Evaluation Breakdown
            </div>
            {internship.match_reasons && internship.match_reasons.length > 0 ? (
              internship.match_reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start justify-between text-slate-300 gap-2">
                  <div className="flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400 shrink-0" />
                    <span>{reason.text}</span>
                  </div>
                  <span className="font-mono text-[11px] text-blue-400 shrink-0">+{reason.weight} pts</span>
                </div>
              ))
            ) : (
              <p className="text-slate-400">Evaluated against target roles and technical skills.</p>
            )}
          </div>
        )}
      </div>

      {/* Private Notes & Follow-Up */}
      {internship.notes && !isEditingNotes && (
        <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-xs text-slate-300 flex items-start justify-between gap-2">
          <p className="italic">{internship.notes}</p>
          <button
            type="button"
            onClick={() => setIsEditingNotes(true)}
            className="text-slate-500 hover:text-slate-300 p-1"
            title="Edit Notes"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      )}

      {isEditingNotes && (
        <div className="space-y-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
            placeholder="Add personal notes, recruiter contacts, or interview round details..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingNotes(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNotes}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium"
            >
              Save Notes
            </button>
          </div>
        </div>
      )}

      {/* Action Footer: Stage Transition Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
        {/* Stage Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Stage:</span>
          <select
            value={internship.status}
            onChange={(e) => onUpdateStatus(internship.id, e.target.value as InternshipStatus)}
            disabled={isSaving}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="bookmarked">Saved / Interested</option>
            <option value="applied">Applied</option>
            <option value="assessment">Online Assessment (OA)</option>
            <option value="interviewing">Interviewing</option>
            <option value="offered">Offer Received</option>
            <option value="rejected">Declined</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center gap-2">
          {!internship.notes && !isEditingNotes && (
            <button
              type="button"
              onClick={() => setIsEditingNotes(true)}
              className="inline-flex items-center px-2 py-1 text-slate-400 hover:text-slate-200 rounded border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Notes
            </button>
          )}

          {!internship.deadline && !isEditingDeadline && (
            <button
              type="button"
              onClick={() => setIsEditingDeadline(true)}
              className="inline-flex items-center px-2 py-1 text-slate-400 hover:text-slate-200 rounded border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <Clock className="w-3 h-3 mr-1" />
              Deadline
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(internship.id)}
            className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors rounded hover:bg-slate-800"
            title="Delete Opportunity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
