import React, { useState } from 'react'
import type { ContentRecommendationRecord } from '../../types/contentPlanner'
import { usePostMedia } from '../../hooks/usePostMedia'
import { useLinkedInConnection } from '../../hooks/useLinkedInConnection'
import { formatFileSize } from '../../services/mediaValidationService'
import {
  X,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Image,
  UploadCloud,
  Send,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

interface ManualPublishModalProps {
  isOpen: boolean
  onClose: () => void
  post: ContentRecommendationRecord | null
  onConfirmPublished: (postId: string, publishedAt: string) => Promise<boolean>
}

export const ManualPublishModal: React.FC<ManualPublishModalProps> = ({
  isOpen,
  onClose,
  post,
  onConfirmPublished,
}) => {
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPublishingApi, setIsPublishingApi] = useState(false)
  const [apiSuccessMessage, setApiSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { mediaAssets } = usePostMedia(post?.id || null)
  const { connection, sharePost } = useLinkedInConnection()

  if (!isOpen || !post) return null

  const handleCopy = async () => {
    const textToCopy = post.post_body || `${post.topic}\n\n${post.suggested_angle}`
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleOpenLinkedIn = () => {
    window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank', 'noopener,noreferrer')
  }

  const handleApiPublish = async () => {
    setIsPublishingApi(true)
    setError(null)
    setApiSuccessMessage(null)
    const textToPublish = post.post_body || `${post.topic}\n\n${post.suggested_angle}`
    try {
      const res = await sharePost(textToPublish, post.id)
      if (res.success) {
        setApiSuccessMessage('Post published successfully to your LinkedIn feed!')
        await onConfirmPublished(post.id, new Date().toISOString())
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError(res.error || 'Failed to publish via LinkedIn API')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error publishing post')
    } finally {
      setIsPublishingApi(false)
    }
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const nowIso = new Date().toISOString()
      const success = await onConfirmPublished(post.id, nowIso)
      if (success) {
        onClose()
      } else {
        setError('Failed to update published status. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B19]/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#D9CFC2] bg-[#FAF7F2] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#1C1B19] text-[#C6A76B] border border-[#C6A76B]/30">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#292722]">
                Publish to LinkedIn (Safe Manual Workflow)
              </h2>
              <p className="text-xs text-[#73685B]">
                Copy approved copy, open LinkedIn's official composer, and record your publishing timestamp.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#73685B] hover:text-[#292722] rounded-xl hover:bg-[#E8DFD3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-[#FCEEEE] border border-[#F0C4C4] rounded-xl flex items-center gap-2 text-[#942F2F] text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Compliance notice */}
          <div className="p-4 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl flex items-start gap-3 text-xs text-[#73685B]">
            <ShieldCheck className="w-5 h-5 text-[#2E5A36] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#292722]">
                100% LinkedIn Terms of Service Compliant:
              </span>{' '}
              In strict accordance with LinkedIn User Agreement (Section 8.2), automated posting via unauthorized scripts or bot scrapers is prohibited and risks profile restrictions. This assistant guarantees your account safety by letting you review, copy, and confirm posts via the official composer.
            </div>
          </div>

          {/* Step 1: Copy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#292722]">
                Step 1: Copy Approved Post Content
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] hover:bg-[#E8DFD3] text-[#292722] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#2E5A36]" />
                    <span className="text-[#2E5A36]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#73685B]" />
                    <span>Copy Post Text</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl font-mono text-xs text-[#292722] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {post.post_body || `${post.topic}\n\n${post.suggested_angle}`}
            </div>
          </div>

          {/* Attached Media Reference if present */}
          {post.media_url && (
            <div className="p-4 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#292722] flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-[#73685B]" />
                  Attached Visual Media Reference
                </span>
                <a
                  href={post.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#292722] hover:text-[#73685B] font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Asset Source
                </a>
              </div>
              {post.media_description && (
                <p className="text-xs text-[#73685B]">{post.media_description}</p>
              )}
              <p className="text-[10px] text-[#73685B] font-mono truncate">{post.media_url}</p>
            </div>
          )}

          {/* Uploaded Device Attachments if present */}
          {mediaAssets.length > 0 && (
            <div className="p-4 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#292722] flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-[#73685B]" />
                  Uploaded Device Attachments ({mediaAssets.length})
                </span>
                <span className="text-[10px] text-[#73685B]">
                  Ready to attach to your LinkedIn post
                </span>
              </div>

              <div className="space-y-1.5">
                {mediaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#D9CFC2] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#292722] font-medium truncate">{asset.file_name}</span>
                      <span className="text-[10px] text-[#73685B] font-mono">
                        ({formatFileSize(asset.file_size)})
                      </span>
                    </div>
                    {asset.preview_url && (
                      <a
                        href={asset.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#292722] hover:text-[#73685B] font-semibold flex items-center gap-1 flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Asset
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success notice */}
          {apiSuccessMessage && (
            <div className="p-3.5 bg-[#EAF2EC] border border-[#C6DEC9] rounded-xl flex items-center gap-2 text-[#2E5A36] text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{apiSuccessMessage}</span>
            </div>
          )}

          {/* Connected LinkedIn 1-Click Option */}
          {connection.connected ? (
            <div className="p-4 bg-[#1C1B19] border border-[#C6A76B]/40 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-[#FAF7F2] text-[#1C1B19] flex items-center justify-center font-bold text-xs">
                    in
                  </div>
                  <span className="text-xs font-semibold text-[#FAF7F2]">
                    1-Click Direct Publish to LinkedIn Feed
                  </span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#FAF7F2]/10 text-[#C6A76B] border border-[#C6A76B]/30">
                  Official API
                </span>
              </div>
              <p className="text-xs text-[#FAF7F2]/80 leading-relaxed">
                Publish approved post commentary directly to your connected account ({connection.name || 'Member'}) via the official Member Share API.
              </p>
              <button
                type="button"
                onClick={handleApiPublish}
                disabled={isPublishingApi}
                className="w-full py-2.5 px-4 bg-[#C6A76B] hover:bg-[#B39357] text-[#1C1B19] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                {isPublishingApi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing to LinkedIn...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Directly to LinkedIn Feed</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-3.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl flex items-center justify-between text-xs text-[#73685B]">
              <span>Want 1-click publishing? Connect your account in the <strong>Integrations</strong> tab.</span>
            </div>
          )}

          {/* Manual Workflow */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#292722]">
              {connection.connected ? 'Alternative: Safe Manual Workflow' : 'Step 2: Paste & Publish on LinkedIn'}
            </label>
            <div className="flex items-center justify-between p-3.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl">
              <div className="text-xs text-[#73685B]">
                Opens the official LinkedIn post composer in a new tab:
              </div>
              <button
                type="button"
                onClick={handleOpenLinkedIn}
                className="px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open LinkedIn Composer
              </button>
            </div>
          </div>

          {/* Step 3: Confirm Published */}
          <div className="space-y-2 pt-2 border-t border-[#D9CFC2]">
            <label className="text-xs font-semibold text-[#292722]">
              Step 3: Confirm & Log Publishing Time
            </label>
            <p className="text-xs text-[#73685B] leading-relaxed">
              Once you have clicked "Post" on LinkedIn, click below to mark this post as Published. This sets the status, locks in the publication date, and prepares the post for performance tracking.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#D9CFC2] bg-[#FAF7F2] rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#D9CFC2] hover:bg-[#E8DFD3] text-[#292722] rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-[#2E5A36] hover:bg-[#234529] disabled:opacity-50 text-[#FAF7F2] rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? 'Confirming...' : 'Confirm Published'}
          </button>
        </div>
      </div>
    </div>
  )
}
