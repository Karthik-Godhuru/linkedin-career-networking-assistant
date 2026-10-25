import React, { useState } from 'react'
import type { ContentRecommendationRecord } from '../../types/contentPlanner'
import { usePostMedia } from '../../hooks/usePostMedia'
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
  const [error, setError] = useState<string | null>(null)
  const { mediaAssets } = usePostMedia(post?.id || null)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Publish to LinkedIn (Safe Manual Workflow)
              </h2>
              <p className="text-xs text-slate-400">
                Copy approved copy, open LinkedIn's official composer, and record your publishing timestamp.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Compliance notice */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">
                100% LinkedIn Terms of Service Compliant:
              </span>{' '}
              In strict accordance with LinkedIn User Agreement (Section 8.2), automated posting via unauthorized scripts or bot scrapers is prohibited and risks profile restrictions. This assistant guarantees your account safety by letting you review, copy, and confirm posts via the official composer.
            </div>
          </div>

          {/* Step 1: Copy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Step 1: Copy Approved Post Content
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1 bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Post Text</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {post.post_body || `${post.topic}\n\n${post.suggested_angle}`}
            </div>
          </div>

          {/* Attached Media Reference if present */}
          {post.media_url && (
            <div className="p-3.5 bg-slate-950 border border-indigo-900/50 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-indigo-400" />
                  Attached Visual Media Reference
                </span>
                <a
                  href={post.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Asset Source
                </a>
              </div>
              {post.media_description && (
                <p className="text-xs text-slate-300">{post.media_description}</p>
              )}
              <p className="text-[10px] text-slate-500 font-mono truncate">{post.media_url}</p>
            </div>
          )}

          {/* Uploaded Device Attachments if present */}
          {mediaAssets.length > 0 && (
            <div className="p-3.5 bg-slate-950 border border-indigo-900/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                  Uploaded Device Attachments ({mediaAssets.length})
                </span>
                <span className="text-[10px] text-slate-500">
                  Ready to attach to your LinkedIn post
                </span>
              </div>

              <div className="space-y-1.5">
                {mediaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-200 truncate">{asset.file_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({formatFileSize(asset.file_size)})
                      </span>
                    </div>
                    {asset.preview_url && (
                      <a
                        href={asset.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 flex-shrink-0"
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

          {/* Step 2: Open LinkedIn */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Step 2: Paste & Publish on LinkedIn
            </label>
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400">
                Opens the official LinkedIn post composer in a new tab:
              </div>
              <button
                type="button"
                onClick={handleOpenLinkedIn}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open LinkedIn Composer
              </button>
            </div>
          </div>

          {/* Step 3: Confirm Published */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-300">
              Step 3: Confirm & Log Publishing Time
            </label>
            <p className="text-xs text-slate-400">
              Once you have clicked "Post" on LinkedIn, click below to mark this post as Published. This sets the status, locks in the publication date, and prepares the post for performance tracking.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shadow flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? 'Confirming...' : 'Confirm Published'}
          </button>
        </div>
      </div>
    </div>
  )
}
