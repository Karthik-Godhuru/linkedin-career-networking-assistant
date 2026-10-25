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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Post Performance Metrics</h2>
              <p className="text-xs text-slate-400">Log engagement metrics from your published post.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Post preview */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Topic: {post.topic}
            </span>
            <p className="text-xs text-slate-300 line-clamp-2">
              {post.post_body || post.suggested_angle}
            </p>
          </div>

          {/* KPI preview cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex flex-col items-center justify-center text-center">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                Engagement Rate
              </span>
              <span className="text-2xl font-bold text-white mt-1">{engagementRate}%</span>
              <span className="text-[10px] text-slate-500">Industry benchmark: 1.5% - 3.5%</span>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex flex-col items-center justify-center text-center">
              <span className="text-xs text-slate-400">Total Interactions</span>
              <span className="text-2xl font-bold text-purple-300 mt-1">{totalEngagements}</span>
              <span className="text-[10px] text-slate-500">Reactions + Comments + Reposts</span>
            </div>
          </div>

          {/* Metric input fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                Impressions (Views)
              </label>
              <input
                type="number"
                min="0"
                value={impressions}
                onChange={(e) => setImpressions(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                Reactions (Likes)
              </label>
              <input
                type="number"
                min="0"
                value={reactions}
                onChange={(e) => setReactions(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                Comments
              </label>
              <input
                type="number"
                min="0"
                value={comments}
                onChange={(e) => setComments(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Repeat2 className="w-3.5 h-3.5 text-emerald-400" />
                Reposts / Shares
              </label>
              <input
                type="number"
                min="0"
                value={reposts}
                onChange={(e) => setReposts(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Explanation footnote */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-2 text-xs text-slate-400">
            <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p>
              LinkedIn restricts organic metrics APIs to enterprise partners. Logging metrics manually preserves privacy and avoids browser extensions that risk profile flags.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shadow flex items-center gap-2"
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
