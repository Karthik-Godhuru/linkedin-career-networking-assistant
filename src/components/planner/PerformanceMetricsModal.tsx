import React, { useState } from 'react'
import type { ContentRecommendationRecord } from '../../types/contentPlanner'
import { calculateEngagementRate } from '../../utils/plannerUtils'
import {
  X,
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Repeat2,
  AlertCircle,
  HelpCircle,
  Check,
} from 'lucide-react'

interface PerformanceMetricsModalProps {
  isOpen: boolean
  onClose: () => void
  post: ContentRecommendationRecord | null
  onSaveMetrics: (
    postId: string,
    metrics: { impressions: number; reactions: number; comments: number; reposts: number }
  ) => Promise<boolean>
}

export const PerformanceMetricsModal: React.FC<PerformanceMetricsModalProps> = ({
  isOpen,
  onClose,
  post,
  onSaveMetrics,
}) => {
  const [impressions, setImpressions] = useState<number>(() => post?.impressions || 0)
  const [reactions, setReactions] = useState<number>(() => post?.reactions || 0)
  const [comments, setComments] = useState<number>(() => post?.comments || 0)
  const [reposts, setReposts] = useState<number>(() => post?.reposts || 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !post) return null

  const totalEngagements = reactions + comments + reposts
  const engagementRate = calculateEngagementRate(impressions, reactions, comments, reposts)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const success = await onSaveMetrics(post.id, {
        impressions: Math.max(0, impressions),
        reactions: Math.max(0, reactions),
        comments: Math.max(0, comments),
        reposts: Math.max(0, reposts),
      })

      if (success) {
        onClose()
      } else {
        setError('Failed to record performance metrics.')
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B19]/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#D9CFC2] bg-[#FAF7F2] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#1C1B19] text-[#C6A76B] border border-[#C6A76B]/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#292722]">Post Performance Metrics</h2>
              <p className="text-xs text-[#73685B]">Log engagement metrics from your published post.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#73685B] hover:text-[#292722] rounded-xl hover:bg-[#E8DFD3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-[#FCEEEE] border border-[#F0C4C4] rounded-xl flex items-center gap-2 text-[#942F2F] text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Post preview */}
          <div className="p-3.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl">
            <span className="text-[10px] font-semibold text-[#73685B] uppercase tracking-wider block mb-1">
              Topic: {post.topic}
            </span>
            <p className="text-xs text-[#292722] line-clamp-2">
              {post.post_body || post.suggested_angle}
            </p>
          </div>

          {/* KPI preview cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-xs text-[#73685B] flex items-center gap-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-[#8A5A20]" />
                Engagement Rate
              </span>
              <span className="text-2xl font-semibold text-[#292722] mt-1">{engagementRate}%</span>
              <span className="text-[10px] text-[#73685B]">Industry benchmark: 1.5% - 3.5%</span>
            </div>

            <div className="p-3.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-xs text-[#73685B] font-medium">Total Interactions</span>
              <span className="text-2xl font-semibold text-[#8A5A20] mt-1">{totalEngagements}</span>
              <span className="text-[10px] text-[#73685B]">Reactions + Comments + Reposts</span>
            </div>
          </div>

          {/* Metric input fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292722] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#73685B]" />
                Impressions (Views)
              </label>
              <input
                type="number"
                min="0"
                value={impressions}
                onChange={(e) => setImpressions(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292722] flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#942F2F]" />
                Reactions (Likes)
              </label>
              <input
                type="number"
                min="0"
                value={reactions}
                onChange={(e) => setReactions(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292722] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#8A5A20]" />
                Comments
              </label>
              <input
                type="number"
                min="0"
                value={comments}
                onChange={(e) => setComments(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292722] flex items-center gap-1.5">
                <Repeat2 className="w-3.5 h-3.5 text-[#2E5A36]" />
                Reposts / Shares
              </label>
              <input
                type="number"
                min="0"
                value={reposts}
                onChange={(e) => setReposts(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs sm:text-sm text-[#292722] focus:outline-none focus:border-[#292722]"
              />
            </div>
          </div>

          {/* Explanation footnote */}
          <div className="p-3.5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl flex items-start gap-2 text-xs text-[#73685B]">
            <HelpCircle className="w-4 h-4 text-[#73685B] flex-shrink-0 mt-0.5" />
            <p>
              LinkedIn restricts organic metrics APIs to enterprise partners. Logging metrics manually preserves privacy and avoids browser extensions that risk profile flags.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#D9CFC2]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#D9CFC2] hover:bg-[#E8DFD3] text-[#292722] rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#292722] hover:bg-[#3D3A33] disabled:opacity-50 text-[#FAF7F2] rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Metrics'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
