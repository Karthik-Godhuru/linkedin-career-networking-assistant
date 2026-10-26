import React, { useState } from 'react'
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Building2,
  Cpu,
  MapPin,
  GraduationCap,
  Sparkles,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { TagInput } from './TagInput'
import { useCareerProfile } from '../../hooks/useCareerProfile'
import {
  careerProfileSchema,
  ExperienceLevelEnum,
  experienceLevelLabels,
  DEFAULT_SUGGESTED_ROLES,
  DEFAULT_SUGGESTED_COMPANIES,
  DEFAULT_SUGGESTED_SKILLS,
  DEFAULT_SUGGESTED_LOCATIONS,
  type CareerProfileFormData,
  type ExperienceLevel,
} from '../../types/profile'

interface FormInnerProps {
  initialData: CareerProfileFormData
  updatedAt?: string
  saving: boolean
  saveProfile: (data: CareerProfileFormData) => Promise<{ success: boolean; error?: string }>
  onReset: () => void
  clearStatus: () => void
}

const CareerGoalsFormInner: React.FC<FormInnerProps> = ({
  initialData,
  updatedAt,
  saving,
  saveProfile,
  onReset,
  clearStatus,
}) => {
  const [formData, setFormData] = useState<CareerProfileFormData>(initialData)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState<boolean>(false)

  const validateField = (field: keyof CareerProfileFormData, value: unknown) => {
    const partialObj = { ...formData, [field]: value }
    const result = careerProfileSchema.safeParse(partialObj)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === field)
      setFieldErrors((prev) => ({
        ...prev,
        [field]: issue ? issue.message : '',
      }))
    } else {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: '',
      }))
    }
  }

  const updateField = <K extends keyof CareerProfileFormData>(
    field: K,
    value: CareerProfileFormData[K]
  ) => {
    clearStatus()
    setIsDirty(true)
    setFormData((prev) => ({ ...prev, [field]: value }))
    validateField(field, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearStatus()

    const result = careerProfileSchema.safeParse(formData)
    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = String(issue.path[0])
        if (!errors[path]) {
          errors[path] = issue.message
        }
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    const res = await saveProfile(formData)
    if (res.success) {
      setIsDirty(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Experience Level Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-[#292722]">
          Experience Level / Stage <span className="text-[#8A5A20]">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ExperienceLevelEnum.options.map((level) => {
            const isSelected = formData.experience_level === level
            return (
              <button
                key={level}
                type="button"
                onClick={() => updateField('experience_level', level as ExperienceLevel)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#1C1B19] border-[#C6A76B]/50 text-[#FAF7F2] shadow-sm'
                    : 'bg-[#FAF7F2] border-[#D9CFC2] text-[#73685B] hover:text-[#292722] hover:bg-[#E8DFD3]'
                }`}
              >
                <div className={`text-xs font-semibold ${isSelected ? 'text-[#C6A76B]' : 'text-[#292722]'}`}>
                  {experienceLevelLabels[level]}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Target Roles */}
      <div className="pt-2">
        <div className="flex items-center space-x-2 text-[#73685B] mb-1">
          <Briefcase className="w-3.5 h-3.5 text-[#B49A7D]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#73685B]">Target Roles</span>
        </div>
        <TagInput
          label="Target Roles & Titles"
          description="Specific engineering and AI positions you want to discover (e.g. AI/ML Engineer, Python Developer)"
          placeholder="Type role and press Enter..."
          tags={formData.target_roles}
          onChange={(roles) => updateField('target_roles', roles)}
          suggestions={DEFAULT_SUGGESTED_ROLES}
          required
          error={fieldErrors.target_roles}
        />
      </div>

      {/* Target Skills */}
      <div className="pt-2">
        <div className="flex items-center space-x-2 text-[#73685B] mb-1">
          <Cpu className="w-3.5 h-3.5 text-[#B49A7D]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#73685B]">Core Technologies</span>
        </div>
        <TagInput
          label="Technical Skills & Frameworks"
          description="Frameworks, tools, and libraries you specialize in or want to match against (e.g. PyTorch, React, FastAPI)"
          placeholder="Type skill and press Enter..."
          tags={formData.target_skills}
          onChange={(skills) => updateField('target_skills', skills)}
          suggestions={DEFAULT_SUGGESTED_SKILLS}
          required
          error={fieldErrors.target_skills}
        />
      </div>

      {/* Target Companies */}
      <div className="pt-2">
        <div className="flex items-center space-x-2 text-[#73685B] mb-1">
          <Building2 className="w-3.5 h-3.5 text-[#B49A7D]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#73685B]">Target Companies</span>
        </div>
        <TagInput
          label="Target Companies, Labs & Startups"
          description="Specific companies, venture stages, or AI labs you want to target for connections and internships"
          placeholder="Type company name and press Enter..."
          tags={formData.target_companies}
          onChange={(comps) => updateField('target_companies', comps)}
          suggestions={DEFAULT_SUGGESTED_COMPANIES}
          required
          error={fieldErrors.target_companies}
        />
      </div>

      {/* Preferred Locations */}
      <div className="pt-2">
        <div className="flex items-center space-x-2 text-[#73685B] mb-1">
          <MapPin className="w-3.5 h-3.5 text-[#B49A7D]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#73685B]">Locations</span>
        </div>
        <TagInput
          label="Preferred Locations & Remote Work"
          description="Target cities or remote working arrangements"
          placeholder="Type location (e.g. Remote, Bengaluru, San Francisco) and press Enter..."
          tags={formData.target_locations}
          onChange={(locs) => updateField('target_locations', locs)}
          suggestions={DEFAULT_SUGGESTED_LOCATIONS}
          required
          error={fieldErrors.target_locations}
        />
      </div>

      {/* Alumni Networks */}
      <div className="pt-2">
        <div className="flex items-center space-x-2 text-[#73685B] mb-1">
          <GraduationCap className="w-3.5 h-3.5 text-[#B49A7D]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#73685B]">Alumni Networks</span>
        </div>
        <TagInput
          label="Colleges, Universities & Bootcamps"
          description="Your current or past academic institutions (helps highlight alumni connection opportunities)"
          placeholder="Type university / college name and press Enter..."
          tags={formData.alumni_institutions}
          onChange={(insts) => updateField('alumni_institutions', insts)}
          suggestions={['IIT', 'NIT', 'BITS Pilani', 'IIIT', 'University of California', 'Carnegie Mellon']}
          error={fieldErrors.alumni_institutions}
        />
      </div>

      {/* Career Objective / Bio Summary */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-[#292722]">
            Career Goal &amp; Background Summary (Optional)
          </label>
          <span className="text-[11px] text-[#73685B] font-mono">
            {(formData.bio_summary || '').length}/800
          </span>
        </div>
        <p className="text-xs text-[#73685B] leading-relaxed">
          A concise summary of your current project focus, research interests, and what you are looking for. Used by the AI drafter to add authentic context.
        </p>
        <textarea
          rows={3}
          value={formData.bio_summary || ''}
          onChange={(e) => updateField('bio_summary', e.target.value)}
          placeholder="e.g. Final-year B.Tech CSE student specializing in AI/ML. Building production LLM pipelines with PyTorch and React. Actively seeking AI/ML engineering internships for Summer 2027."
          className="w-full p-3 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs sm:text-sm text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D] focus:ring-1 focus:ring-[#B49A7D] transition-colors"
        />
        {fieldErrors.bio_summary && (
          <p className="text-[11px] text-[#942F2F]">{fieldErrors.bio_summary}</p>
        )}
      </div>

      {/* Action Controls */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#D9CFC2]">
        <div className="flex items-center space-x-3 text-xs text-[#73685B]">
          {isDirty && (
            <span className="inline-flex items-center text-[#8A5A20] font-medium">
              &bull; Unsaved changes
            </span>
          )}
          {updatedAt && !isDirty && (
            <span className="text-[#73685B] font-mono text-[11px]">
              Synced: {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              onReset()
              setFormData(initialData)
              setIsDirty(false)
              clearStatus()
            }}
            disabled={saving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] text-xs font-medium rounded-md border border-[#D9CFC2] transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-2.5 bg-[#1C1B19] hover:bg-[#292722] text-[#FAF7F2] border border-[#C6A76B]/40 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-[#C6A76B]" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2 text-[#C6A76B]" />
                Save Career Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

export const CareerGoalsForm: React.FC = () => {
  const {
    profile,
    recordMeta,
    loading,
    saving,
    error,
    saveSuccess,
    saveProfile,
    refetch,
    clearStatus,
  } = useCareerProfile()

  if (loading) {
    return (
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#292722] mx-auto mb-3" />
        <p className="text-xs uppercase tracking-wider text-[#73685B]">Loading your saved career profile...</p>
      </div>
    )
  }

  return (
    <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-6 sm:p-8 shadow-sm text-left space-y-6">
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D9CFC2]">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded bg-[#E8DFD3] border border-[#D9CFC2] text-[#73685B] text-xs font-medium uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-[#B49A7D]" />
            <span>Career Discovery Criteria</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-light text-[#292722] tracking-tight">
            Career Goals &amp; Networking Preferences
          </h2>
          <p className="text-xs sm:text-sm text-[#73685B] mt-1 font-normal leading-relaxed">
            Configure target roles, skills, and criteria to power personalized matching and connection drafting.
          </p>
        </div>

        {recordMeta.updated_at && (
          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] text-[#73685B] block">Last Synced</span>
            <span className="text-xs text-[#292722] font-mono">
              {new Date(recordMeta.updated_at).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-md bg-[#EAF2EC] border border-[#C6DEC9] flex items-center space-x-3 text-[#2E5A36] text-xs sm:text-sm">
          <CheckCircle2 className="w-4 h-4 text-[#2E5A36] shrink-0" />
          <div>
            <span className="font-semibold">Preferences saved successfully!</span>
            <p className="text-[#2E5A36]/80 text-xs mt-0.5">
              Your career goals are securely stored in your isolated Supabase tenant.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-md bg-[#FCEEEE] border border-[#F0C4C4] flex items-center space-x-3 text-[#942F2F] text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-[#942F2F] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <CareerGoalsFormInner
        key={recordMeta.updated_at || 'initial'}
        initialData={profile}
        updatedAt={recordMeta.updated_at}
        saving={saving}
        saveProfile={saveProfile}
        onReset={refetch}
        clearStatus={clearStatus}
      />
    </div>
  )
}
