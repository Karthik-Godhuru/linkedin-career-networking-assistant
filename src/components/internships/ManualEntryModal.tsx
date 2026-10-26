import React, { useState } from 'react'
import type { InternshipRawInput, WorkMode } from '../../types/internship'
import { X, Plus, AlertCircle } from 'lucide-react'

interface ManualEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: InternshipRawInput) => Promise<{ success: boolean; error?: string }>
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode>('onsite')
  const [postingUrl, setPostingUrl] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !company.trim() || !postingUrl.trim()) {
      setError('Title, Company, and Application URL are required.')
      return
    }

    try {
      new URL(postingUrl)
    } catch {
      setError('Please provide a valid application URL (including https://).')
      return
    }

    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    setIsSubmitting(true)
    const result = await onSubmit({
      title: title.trim(),
      company: company.trim(),
      location: location.trim() || (workMode === 'remote' ? 'Remote' : undefined),
      work_mode: workMode,
      posting_url: postingUrl.trim(),
      source: 'manual_entry',
      required_skills: skills,
      deadline: deadline || null,
      notes: notes.trim() || null,
    })

    setIsSubmitting(false)
    if (result.success) {
      setTitle('')
      setCompany('')
      setLocation('')
      setPostingUrl('')
      setSkillsInput('')
      setDeadline('')
      setNotes('')
      onClose()
    } else {
      setError(result.error || 'Failed to save opportunity.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B19]/70 backdrop-blur-sm">
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] text-left">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#D9CFC2] flex items-center justify-between bg-[#FAF7F2]">
          <h2 className="text-base font-semibold text-[#292722] tracking-tight">
            Add Internship Opportunity
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#73685B] hover:text-[#292722] p-1.5 rounded-xl hover:bg-[#E8DFD3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-[#FCEEEE] border border-[#F0C4C4] text-[#942F2F] rounded-md text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#292722] mb-1">
              Opportunity Title <span className="text-[#942F2F]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Machine Learning Engineering Intern (Summer 2026)"
              className="w-full bg-[#FAF7F2] border border-[#D9CFC2] rounded-md px-3 py-2 text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#292722] mb-1">
                Company / Organization <span className="text-[#942F2F]">*</span>
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. OpenAI / Google / Cohere"
                className="w-full bg-[#FAF7F2] border border-[#D9CFC2] rounded-md px-3 py-2 text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292722] mb-1">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="w-full bg-[#FAF7F2] border border-[#D9CFC2] rounded-md px-3 py-2 text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#292722] mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA or Remote"
                className="w-full bg-[#FAF7F2] border border-[#D9CFC2] rounded-md px-3 py-2 text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292722] mb-1">
                Application Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#D9CFC2] rounded-md px-3 py-2 text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292722] mb-1">
              Official Application URL <span className="text-[#942F2F]">*</span>
            </label>
            <input
              type="url"
              required
              value={postingUrl}
              onChange={(e) => setPostingUrl(e.target.value)}
              placeholder="https://careers.company.com/jobs/..."
              className="w-full bg-[#FAF7F2] border border-[#D9CFC2] rounded-md px-3 py-2 text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
            />
            <p className="text-[11px] text-[#73685B] mt-1">
              Direct link to Greenhouse, Lever, Workday or company careers portal.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292722] mb-1">
              Required Skills (comma separated)
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="Python, PyTorch, Transformers, SQL"
              className="w-full bg-[#FAF7F2] border border-[#D9CFC2] rounded-md px-3 py-2 text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292722] mb-1">
              Personal Notes / Context
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Reached out to university recruiter on LinkedIn; take-home OA expected..."
              className="w-full bg-[#FAF7F2] border border-[#D9CFC2] rounded-md px-3 py-2 text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#D9CFC2]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#73685B] hover:text-[#292722] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] disabled:opacity-50 text-[#FAF7F2] text-xs font-medium rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {isSubmitting ? 'Evaluating...' : 'Save Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
