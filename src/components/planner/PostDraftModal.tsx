import React, { useState } from 'react'
import type {
  ContentPlanInput,
  ContentRecommendationRecord,
  ContentStatus,
  ContentTone,
} from '../../types/contentPlanner'
import { TONE_OPTIONS, CONTENT_STATUS_CONFIGS } from '../../types/contentPlanner'
import type { CareerProfileFormData } from '../../types/profile'
import { generatePostDraft } from '../../services/contentGenerator'
import { useAuth } from '../../hooks/useAuth'
import { usePostMedia } from '../../hooks/usePostMedia'
import { generateUuid } from '../../services/mediaValidationService'
import { VisualMediaFinder } from './VisualMediaFinder'
import {
  X,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react'

interface PostDraftModalProps {
  isOpen: boolean
  onClose: () => void
  initialPost?: ContentRecommendationRecord | null
  defaultDate?: string | null
  defaultSlot?: number | null
  onSave: (data: ContentPlanInput) => Promise<boolean>
  profile: CareerProfileFormData
}

export const PostDraftModal: React.FC<PostDraftModalProps> = ({
  isOpen,
  onClose,
  initialPost,
  defaultDate,
  defaultSlot,
  onSave,
  profile,
}) => {
  const { session } = useAuth()
  const [topic, setTopic] = useState(() => initialPost?.topic || '')
  const [suggestedAngle, setSuggestedAngle] = useState(() => initialPost?.suggested_angle || '')
  const [sourceMaterial, setSourceMaterial] = useState(() => initialPost?.source_material || '')
  const [targetAudience, setTargetAudience] = useState(() => initialPost?.target_audience || '')
  const [tone, setTone] = useState<ContentTone>(() => initialPost?.tone || 'insightful_technical')
  const [postBody, setPostBody] = useState(() => initialPost?.post_body || '')
  const [scheduledDate, setScheduledDate] = useState(
    () => initialPost?.scheduled_date || defaultDate || ''
  )
  const [slotNumber, setSlotNumber] = useState<number>(
    () => initialPost?.slot_number || defaultSlot || 1
  )
  const [draftStatus, setDraftStatus] = useState<ContentStatus>(
    () => initialPost?.draft_status || 'draft'
  )
  const [hashtags, setHashtags] = useState<string[]>(
    () => initialPost?.suggested_hashtags || []
  )
  const [newHashtagInput, setNewHashtagInput] = useState('')
  const [mediaUrl, setMediaUrl] = useState(() => initialPost?.media_url || '')
  const [mediaDescription, setMediaDescription] = useState(
    () => initialPost?.media_description || ''
  )
  const isExistingPost = Boolean(initialPost?.id)
  const [draftPostId] = useState<string>(
    () => initialPost?.id || generateUuid()
  )

  const {
    mediaAssets,
    uploadAsset,
    commitStagedAssets,
    discardStagedAssets,
    deleteAsset,
    updateCaption,
  } = usePostMedia(draftPostId, { isExistingPost })

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generationNote, setGenerationNote] = useState<string | null>(null)

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please provide a topic or theme before generating a draft.')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGenerationNote(null)

    try {
      const result = await generatePostDraft(
        {
          topic: topic.trim(),
          suggested_angle: suggestedAngle.trim(),
          source_material: sourceMaterial.trim(),
          tone,
        },
        profile,
        session?.access_token
      )

      setPostBody(result.postBody)
      if (result.suggestedAngle && !suggestedAngle) {
        setSuggestedAngle(result.suggestedAngle)
      }
      if (result.suggestedHashtags.length > 0 && hashtags.length === 0) {
        setHashtags(result.suggestedHashtags)
      }

      if (result.generationMethod === 'server_proxy') {
        setGenerationNote('Generated using secure AI proxy.')
      } else {
        setGenerationNote(
          'Generated using deterministic high-signal engine (zero AI slop, no em dashes).'
        )
      }
    } catch {
      setError('Failed to generate draft. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!postBody) return
    try {
      await navigator.clipboard.writeText(postBody)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleAddHashtag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = newHashtagInput.trim().replace(/^#+/, '')
      if (tag && !hashtags.includes(`#${tag}`)) {
        setHashtags([...hashtags, `#${tag}`])
        setNewHashtagInput('')
      }
    }
  }

  const handleRemoveHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter((t) => t !== tagToRemove))
  }

  const handleCancel = async () => {
    await discardStagedAssets()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      setError('Topic is required.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const success = await onSave({
        id: draftPostId,
        topic: topic.trim(),
        suggested_angle: suggestedAngle.trim() || 'Technical insight',
        source_material: sourceMaterial.trim() || undefined,
        target_audience: targetAudience.trim() || undefined,
        tone,
        post_body: postBody.trim() || undefined,
        suggested_hashtags: hashtags,
        scheduled_date: scheduledDate || null,
        slot_number: slotNumber,
        draft_status: draftStatus,
        media_url: mediaUrl.trim() || null,
        media_description: mediaDescription.trim() || null,
      })

      if (success) {
        // Once the parent draft is created in content_recommendations, commit any staged media assets
        const commitRes = await commitStagedAssets(draftPostId)
        if (!commitRes.success) {
          setError(commitRes.error || 'Post draft saved, but some attachments could not be persisted.')
          return
        }
        onClose()
      } else {
        setError('Failed to save post. Please verify your connection.')
      }
    } catch {
      setError('An unexpected error occurred while saving.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const charCount = postBody.length
  const isOverCharLimit = charCount > 3000

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292722]/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#D9CFC2] bg-[#FAF7F2] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#E8DFD3] text-[#73685B]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#292722]">
                {initialPost ? 'Edit Planned Post' : 'Create & Plan LinkedIn Post'}
              </h2>
              <p className="text-xs text-[#73685B]">
                Plan content, generate authentic drafts, and schedule for your weekly slots.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 text-[#73685B] hover:text-[#292722] rounded-xl hover:bg-[#E8DFD3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-[#FCEEEE] border border-[#F0C4C4] rounded-xl flex items-center gap-2 text-[#942F2F] text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Inputs & Context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-[#292722]">
                Post Topic / Core Theme <span className="text-[#8A5A20]">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Asynchronous batching in Python vs synchronous loops"
                className="w-full px-3.5 py-2.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722] placeholder-[#73685B]/60"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292722]">
                Content Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as ContentTone)}
                className="w-full px-3.5 py-2.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722]"
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#73685B]">
                {TONE_OPTIONS.find((t) => t.id === tone)?.description}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292722]">
                Status
              </label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as ContentStatus)}
                className="w-full px-3.5 py-2.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722]"
              >
                {Object.values(CONTENT_STATUS_CONFIGS).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.description})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292722]">
                Target Audience (Optional)
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Senior Backend Engineers, Tech Leads"
                className="w-full px-3.5 py-2.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722] placeholder-[#73685B]/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292722]">
                Scheduled Slot Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292722]">
                Weekly Slot
              </label>
              <select
                value={slotNumber}
                onChange={(e) => setSlotNumber(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722]"
              >
                <option value={1}>Slot 1 (Tuesday morning)</option>
                <option value={2}>Slot 2 (Thursday morning)</option>
              </select>
            </div>
          </div>

          {/* Section 2: Source Material & Raw Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#292722]">
                Source Material / Project Notes / Benchmark Findings (Optional)
              </label>
              <span className="text-[11px] text-[#73685B]">
                Paste code snippets, numbers, or pull request summary
              </span>
            </div>
            <textarea
              rows={3}
              value={sourceMaterial}
              onChange={(e) => setSourceMaterial(e.target.value)}
              placeholder="e.g. Cut throughput latency by 35% on batch inference by switching from synchronous JSON parsing to orjson. Tested on AWS g5.2xlarge with 10k requests."
              className="w-full px-3.5 py-2.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722] placeholder-[#73685B]/60"
            />
          </div>

          {/* Generator trigger button */}
          <div className="flex items-center justify-between pt-3 pb-1 border-t border-[#D9CFC2]">
            <div className="text-xs text-[#73685B]">
              Generate a high-signal, anti-slop post draft matching your tone & skills.
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="px-4 py-2.5 bg-[#1C1B19] hover:bg-[#292722] border border-[#C6A76B]/40 disabled:opacity-40 text-[#FAF7F2] rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#C6A76B]" />
              {isGenerating ? 'Generating...' : 'Generate Draft'}
            </button>
          </div>

          {generationNote && (
            <div className="p-3 bg-[#1C1B19] border border-[#C6A76B]/30 rounded-xl text-[#C6A76B] text-xs flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 flex-shrink-0 text-[#C6A76B]" />
              <span>{generationNote}</span>
            </div>
          )}

          {/* Section 3: Editable Post Draft Area - Dark Graphite Cinematic Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#292722] flex items-center gap-2">
                <span>Post Body (Editable Preview)</span>
                {copied && <span className="text-[#C6A76B] text-xs font-medium">Copied to clipboard!</span>}
              </label>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs ${
                    isOverCharLimit ? 'text-[#942F2F] font-semibold' : 'text-[#73685B]'
                  }`}
                >
                  {charCount} / 3000 chars
                </span>
                {postBody && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs text-[#9C7B4C] hover:text-[#C6A76B] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                )}
              </div>
            </div>
            <textarea
              rows={8}
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              placeholder="Your drafted post text will appear here. You can edit and refine it freely before approving or publishing."
              className="w-full px-3.5 py-3 bg-[#1C1B19] border border-[#C6A76B]/40 rounded-xl text-xs sm:text-sm text-[#FAF7F2] font-mono focus:outline-none focus:border-[#C6A76B] placeholder-[#FAF7F2]/40 leading-relaxed shadow-inner"
            />
          </div>

          {/* Section 4: Hashtags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#292722]">
              Suggested Hashtags
            </label>
            <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E8DFD3] text-[#292722] border border-[#D9CFC2] text-xs font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveHashtag(tag)}
                    className="text-[#73685B] hover:text-[#942F2F]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={newHashtagInput}
                onChange={(e) => setNewHashtagInput(e.target.value)}
                onKeyDown={handleAddHashtag}
                placeholder="Type tag & press enter..."
                className="flex-1 min-w-[120px] bg-transparent border-none text-xs text-[#292722] focus:outline-none placeholder-[#73685B]/60"
              />
            </div>
          </div>

          {/* Section 5: Visual Media Finder */}
          <VisualMediaFinder
            topic={topic}
            targetSkills={profile.target_skills}
            mediaUrl={mediaUrl}
            mediaDescription={mediaDescription}
            onMediaUrlChange={setMediaUrl}
            onMediaDescriptionChange={setMediaDescription}
            mediaAssets={mediaAssets}
            onUploadFile={uploadAsset}
            onDeleteAsset={deleteAsset}
            onUpdateCaption={updateCaption}
          />
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#D9CFC2] bg-[#FAF7F2] rounded-b-2xl">
          <div className="text-xs text-[#73685B]">
            {profile.target_roles[0] || 'AI Engineer'} • {profile.target_skills.slice(0, 3).join(', ')}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-[#D9CFC2] hover:bg-[#E8DFD3] text-[#292722] rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !topic.trim()}
              className="px-5 py-2.5 bg-[#292722] hover:bg-[#3D3A33] disabled:opacity-40 text-[#FAF7F2] rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : initialPost ? 'Update Post' : 'Save Planned Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
