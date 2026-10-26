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
    <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-5 hover:border-[#B49A7D] transition-colors shadow-sm space-y-4 text-left">
      {/* Header: Title, Company, Status Badge & Match Score */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[#292722] tracking-tight">{internship.title}</h3>
            <span className={`text-xs px-2.5 py-0.5 rounded border font-medium ${stage.badgeColor}`}>
              {stage.label}
            </span>
            {internship.source === 'sample_dataset' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E8DFD3] text-[#73685B] border border-[#D9CFC2]">
                Sample Opportunity
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#73685B]">
            <span className="inline-flex items-center text-[#292722] font-medium">
              <Building2 className="w-3.5 h-3.5 mr-1 text-[#B49A7D]" />
              {internship.company}
            </span>
            {internship.location && (
              <span className="inline-flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-[#B49A7D]" />
                {internship.location}
              </span>
            )}
            <span className="inline-flex items-center capitalize text-[#73685B]">
              Mode: <strong className="ml-1 text-[#292722]">{internship.work_mode || 'onsite'}</strong>
            </span>
          </div>
        </div>

        {/* Match Score Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div
            className={`px-3 py-1.5 rounded-xl border text-center shadow-xs ${
              (internship.match_score ?? 0) >= 80
                ? 'bg-[#1C1B19] border-[#C6A76B]/40 text-[#C6A76B]'
                : (internship.match_score ?? 0) >= 60
                ? 'bg-[#E8DFD3] border-[#D9CFC2] text-[#292722]'
                : 'bg-[#FBF4E8] border-[#E8D5B5] text-[#8A5A20]'
            }`}
          >
            <div className={`text-[10px] uppercase font-mono tracking-wider ${(internship.match_score ?? 0) >= 80 ? 'text-[#C6A76B]/80' : 'text-[#73685B]'}`}>Match</div>
            <div className="text-lg font-bold font-mono leading-tight">{internship.match_score ?? 50}%</div>
          </div>
        </div>
      </div>

      {/* Deadlines & Dates bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D9CFC2] text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {internship.deadline ? (
            <div
              className={`inline-flex items-center px-2.5 py-1 rounded-md border font-medium ${
                isOverdue
                  ? 'bg-[#FCEEEE] text-[#942F2F] border-[#F0C4C4]'
                  : isUpcoming
                  ? 'bg-[#FBF4E8] text-[#8A5A20] border-[#E8D5B5]'
                  : 'bg-[#FAF7F2] text-[#73685B] border-[#D9CFC2]'
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
              className="inline-flex items-center text-[#73685B] hover:text-[#292722] transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              + Add Deadline
            </button>
          )}

          {internship.applied_at && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#EAF2EC] text-[#2E5A36] border border-[#C6DEC9]">
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
          className="inline-flex items-center text-xs font-medium text-[#292722] hover:text-[#B49A7D] hover:underline transition-colors"
        >
          <span>Official Application Portal</span>
          <ExternalLink className="w-3.5 h-3.5 ml-1" />
        </a>
      </div>

      {/* Deadline inline edit */}
      {isEditingDeadline && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-[#FAF7F2] border border-[#D9CFC2] text-xs">
          <input
            type="date"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
            className="px-2 py-1 bg-[#FAF7F2] border border-[#D9CFC2] rounded text-[#292722]"
          />
          <button
            type="button"
            onClick={handleSaveDeadline}
            className="px-2.5 py-1 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] rounded font-medium"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditingDeadline(false)}
            className="px-2.5 py-1 text-[#73685B] hover:text-[#292722]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Skills: Required & Missing */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-[#73685B] font-medium mr-1">Required:</span>
          {internship.required_skills && internship.required_skills.length > 0 ? (
            internship.required_skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded bg-[#E8DFD3] text-[#292722] border border-[#D9CFC2]"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-[#73685B] italic">General engineering criteria</span>
          )}
        </div>

        {internship.missing_skills && internship.missing_skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center pt-1">
            <span className="text-[11px] text-[#8A5A20] font-medium mr-1 flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Skills to Highlight / Develop:
            </span>
            {internship.missing_skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded bg-[#FBF4E8] text-[#8A5A20] border border-[#E8D5B5]"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Transparent Match Reasons (Accordion) */}
      <div className="border-t border-[#D9CFC2] pt-2">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-xs text-[#73685B] hover:text-[#292722] transition-colors py-1"
        >
          <span className="inline-flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#B49A7D]" />
            <span>Why this opportunity matches your career goals</span>
          </span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDetails && (
          <div className="mt-2 p-3 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md space-y-2 text-xs">
            <div className="text-[11px] font-mono text-[#73685B] uppercase tracking-wider">
              Evaluation Breakdown
            </div>
            {internship.match_reasons && internship.match_reasons.length > 0 ? (
              internship.match_reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start justify-between text-[#73685B] gap-2">
                  <div className="flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-[#2E5A36] shrink-0" />
                    <span>{reason.text}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#292722] shrink-0">+{reason.weight} pts</span>
                </div>
              ))
            ) : (
              <p className="text-[#73685B]">Evaluated against target roles and technical skills.</p>
            )}
          </div>
        )}
      </div>

      {/* Private Notes & Follow-Up */}
      {internship.notes && !isEditingNotes && (
        <div className="p-2.5 rounded-md bg-[#FAF7F2] border border-[#D9CFC2] text-xs text-[#292722] flex items-start justify-between gap-2">
          <p className="italic">{internship.notes}</p>
          <button
            type="button"
            onClick={() => setIsEditingNotes(true)}
            className="text-[#73685B] hover:text-[#292722] p-1"
            title="Edit Notes"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      )}

      {isEditingNotes && (
        <div className="space-y-2 p-2.5 rounded-md bg-[#FAF7F2] border border-[#D9CFC2] text-xs">
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            rows={2}
            className="w-full bg-[#FAF7F2] border border-[#D9CFC2] rounded-md p-2 text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
            placeholder="Add personal notes, recruiter contacts, or interview round details..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingNotes(false)}
              className="px-2.5 py-1 text-[#73685B] hover:text-[#292722]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNotes}
              className="px-3 py-1 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] rounded-md font-medium"
            >
              Save Notes
            </button>
          </div>
        </div>
      )}

      {/* Action Footer: Stage Transition Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#D9CFC2] text-xs">
        {/* Stage Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[#73685B] font-medium">Stage:</span>
          <select
            value={internship.status}
            onChange={(e) => onUpdateStatus(internship.id, e.target.value as InternshipStatus)}
            disabled={isSaving}
            className="bg-[#FAF7F2] border border-[#D9CFC2] text-[#292722] text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#B49A7D] cursor-pointer"
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
              className="inline-flex items-center px-2 py-1 text-[#73685B] hover:text-[#292722] rounded border border-[#D9CFC2] hover:bg-[#E8DFD3] transition-colors"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Notes
            </button>
          )}

          {!internship.deadline && !isEditingDeadline && (
            <button
              type="button"
              onClick={() => setIsEditingDeadline(true)}
              className="inline-flex items-center px-2 py-1 text-[#73685B] hover:text-[#292722] rounded border border-[#D9CFC2] hover:bg-[#E8DFD3] transition-colors"
            >
              <Clock className="w-3 h-3 mr-1" />
              Deadline
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(internship.id)}
            className="p-1.5 text-[#73685B] hover:text-[#942F2F] transition-colors rounded hover:bg-[#E8DFD3]"
            title="Delete Opportunity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
