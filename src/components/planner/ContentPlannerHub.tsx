import React, { useState, useMemo } from 'react'
import { useContentPlanner } from '../../hooks/useContentPlanner'
import { useCareerProfile } from '../../hooks/useCareerProfile'
import type {
  ContentRecommendationRecord,
  ContentStatus,
  ContentPlanInput,
} from '../../types/contentPlanner'
import { CONTENT_STATUS_CONFIGS, TONE_OPTIONS } from '../../types/contentPlanner'
import {
  getWeeklySlots,
  formatSlotDate,
  formatWeekRange,
  calculateEngagementRate,
} from '../../utils/plannerUtils'
import { PostDraftModal } from './PostDraftModal'
import { ManualPublishModal } from './ManualPublishModal'
import { PerformanceMetricsModal } from './PerformanceMetricsModal'
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  BarChart3,
  Edit3,
  Trash2,
  CheckCircle2,
  Bell,
  Eye,
  Heart,
  MessageSquare,
  Repeat2,
  Image,
} from 'lucide-react'

export const ContentPlannerHub: React.FC = () => {
  const {
    posts,
    activeWeekMonday,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    createPost,
    updatePost,
    deletePost,
    markPublished,
    updateMetrics,
    reminders,
  } = useContentPlanner()

  const { profile } = useCareerProfile()

  // Modal states
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<ContentRecommendationRecord | null>(null)
  const [draftDefaultDate, setDraftDefaultDate] = useState<string | null>(null)
  const [draftDefaultSlot, setDraftDefaultSlot] = useState<number | null>(null)

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
  const [publishingPost, setPublishingPost] = useState<ContentRecommendationRecord | null>(null)

  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false)
  const [metricsPost, setMetricsPost] = useState<ContentRecommendationRecord | null>(null)

  const [filterStatus, setFilterStatus] = useState<ContentStatus | 'all'>('all')

  // Slots for the active week
  const weeklySlots = useMemo(() => {
    return getWeeklySlots(activeWeekMonday)
  }, [activeWeekMonday])

  // Posts mapped by date
  const slot1Post = useMemo(() => {
    const slot1Info = weeklySlots[0]
    return (
      posts.find(
        (p) =>
          p.scheduled_date === slot1Info.dateStr &&
          (p.slot_number === 1 || !p.slot_number) &&
          p.draft_status !== 'cancelled'
      ) || null
    )
  }, [posts, weeklySlots])

  const slot2Post = useMemo(() => {
    const slot2Info = weeklySlots[1]
    return (
      posts.find(
        (p) =>
          p.scheduled_date === slot2Info.dateStr &&
          (p.slot_number === 2 || !p.slot_number) &&
          p.draft_status !== 'cancelled'
      ) || null
    )
  }, [posts, weeklySlots])

  // Summary KPIs
  const stats = useMemo(() => {
    const ideas = posts.filter((p) => p.draft_status === 'idea').length
    const drafts = posts.filter((p) => p.draft_status === 'draft').length
    const approved = posts.filter((p) => p.draft_status === 'approved').length
    const published = posts.filter((p) => p.draft_status === 'published')
    const totalImpressions = published.reduce((sum, p) => sum + (p.impressions || 0), 0)
    const totalEngagements = published.reduce(
      (sum, p) => sum + (p.reactions || 0) + (p.comments || 0) + (p.reposts || 0),
      0
    )
    const avgEngagementRate =
      totalImpressions > 0
        ? Math.round(((totalEngagements / totalImpressions) * 100) * 100) / 100
        : 0

    return {
      ideas,
      drafts,
      approved,
      publishedCount: published.length,
      totalImpressions,
      avgEngagementRate,
    }
  }, [posts])

  // Filtered post list
  const filteredPosts = useMemo(() => {
    if (filterStatus === 'all') return posts
    return posts.filter((p) => p.draft_status === filterStatus)
  }, [posts, filterStatus])

  // Handlers
  const handleOpenNewDraftForSlot = (dateStr: string, slotNum: number) => {
    setEditingPost(null)
    setDraftDefaultDate(dateStr)
    setDraftDefaultSlot(slotNum)
    setIsDraftModalOpen(true)
  }

  const handleOpenGeneralNewDraft = () => {
    setEditingPost(null)
    setDraftDefaultDate(weeklySlots[0].dateStr)
    setDraftDefaultSlot(1)
    setIsDraftModalOpen(true)
  }

  const handleEditPost = (post: ContentRecommendationRecord) => {
    setEditingPost(post)
    setDraftDefaultDate(post.scheduled_date)
    setDraftDefaultSlot(post.slot_number)
    setIsDraftModalOpen(true)
  }

  const handleOpenPublish = (post: ContentRecommendationRecord) => {
    setPublishingPost(post)
    setIsPublishModalOpen(true)
  }

  const handleOpenMetrics = (post: ContentRecommendationRecord) => {
    setMetricsPost(post)
    setIsMetricsModalOpen(true)
  }

  const handleSaveDraft = async (data: ContentPlanInput): Promise<boolean> => {
    if (editingPost) {
      return await updatePost(editingPost.id, data)
    } else {
      const res = await createPost(data)
      return res !== null
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9CFC2] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1C1B19] border border-[#C6A76B]/40 rounded-xl text-[#C6A76B] shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-[#292722] tracking-tight">
              Content Planner & Twice-Weekly Cadence
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#73685B] mt-1.5 leading-relaxed">
            Build authority with high-signal technical posts. Schedule two planned slots per week and track genuine engagement without third-party scraping.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenGeneralNewDraft}
            className="px-4 py-2.5 bg-[#1C1B19] hover:bg-[#292722] text-[#FAF7F2] border border-[#C6A76B]/40 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#C6A76B]" />
            New Post Draft
          </button>
        </div>
      </div>

      {/* In-App Reminders Banner */}
      {reminders.length > 0 && (
        <div className="p-4 bg-[#FBF4E8] border border-[#E8D5B5] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#E8D5B5]/60 text-[#8A5A20] rounded-xl mt-0.5">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#8A5A20] text-sm">
                  Publishing Slot Reminder ({reminders.length} post{reminders.length > 1 ? 's' : ''} require action)
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FAF7F2] text-[#8A5A20] border border-[#E8D5B5]">
                  In-App Notification
                </span>
              </div>
              <p className="text-xs text-[#8A5A20] mt-1 font-medium">
                {reminders[0].isToday
                  ? `Slot ${reminders[0].slotNumber} post "${reminders[0].topic}" is scheduled for today (${reminders[0].scheduledDate}).`
                  : `Slot ${reminders[0].slotNumber} post "${reminders[0].topic}" is past its scheduled date (${reminders[0].scheduledDate}).`}
              </p>
              <p className="text-[11px] text-[#73685B] mt-0.5">
                Note: In-app reminders trigger while the application is open. For background push alerts, an external push service is required.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {posts.find((p) => p.id === reminders[0].postId) && (
              <button
                onClick={() =>
                  handleOpenPublish(
                    posts.find((p) => p.id === reminders[0].postId)!
                  )
                }
                className="px-3.5 py-1.5 bg-[#8A5A20] hover:bg-[#6E4717] text-[#FAF7F2] rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Publish Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl shadow-sm">
          <div className="text-[10px] text-[#73685B] uppercase font-mono tracking-wider">Ideas</div>
          <div className="text-2xl font-semibold text-[#292722] mt-1">{stats.ideas}</div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Backlog topics</div>
        </div>
        <div className="p-4 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl shadow-sm">
          <div className="text-[10px] text-[#8A5A20] uppercase font-mono tracking-wider">In Draft</div>
          <div className="text-2xl font-semibold text-[#8A5A20] mt-1">{stats.drafts}</div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Under refinement</div>
        </div>
        <div className="p-4 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl shadow-sm">
          <div className="text-[10px] text-[#2E5A36] uppercase font-mono tracking-wider">Approved</div>
          <div className="text-2xl font-semibold text-[#2E5A36] mt-1">{stats.approved}</div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Ready for slot</div>
        </div>
        <div className="p-4 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl shadow-sm">
          <div className="text-[10px] text-[#292722] uppercase font-mono tracking-wider">Published</div>
          <div className="text-2xl font-semibold text-[#292722] mt-1">{stats.publishedCount}</div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Total live posts</div>
        </div>
        <div className="p-4 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl shadow-sm">
          <div className="text-[10px] text-[#73685B] uppercase font-mono tracking-wider">Impressions</div>
          <div className="text-2xl font-semibold text-[#292722] mt-1">
            {stats.totalImpressions.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Total reach</div>
        </div>
        <div className="p-4 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl shadow-sm">
          <div className="text-[10px] text-[#8A5A20] uppercase font-mono tracking-wider">Avg Engagement</div>
          <div className="text-2xl font-semibold text-[#8A5A20] mt-1">
            {stats.avgEngagementRate}%
          </div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Interactions / Views</div>
        </div>
      </div>

      {/* Weekly Schedule Section */}
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-6 space-y-4 shadow-sm">
        {/* Week navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-[#292722] flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#73685B]" />
              Weekly Slot Schedule: {formatWeekRange(activeWeekMonday)}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="p-1.5 rounded-xl border border-[#D9CFC2] bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToCurrentWeek}
              className="px-3.5 py-1.5 rounded-xl border border-[#D9CFC2] bg-[#FAF7F2] hover:bg-[#E8DFD3] text-xs text-[#292722] font-semibold transition-colors"
            >
              Current Week
            </button>
            <button
              onClick={goToNextWeek}
              className="p-1.5 rounded-xl border border-[#D9CFC2] bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2 Weekly Slots Grid - Dark Cinematic Elegance (Antique Parian) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Slot 1: Tuesday */}
          <div className="p-5 bg-[#1C1B19] border border-[#C6A76B]/40 rounded-2xl flex flex-col justify-between min-h-[230px] shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between pb-3 border-b border-[#514435]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C6A76B]"></span>
                  <span className="font-semibold text-sm text-[#FAF7F2]">
                    Slot 1 • Tuesday
                  </span>
                  <span className="text-xs text-[#FAF7F2]/60">
                    ({formatSlotDate(weeklySlots[0].dateStr)})
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#111110] text-[#C6A76B] border border-[#C6A76B]/30">
                  {weeklySlots[0].recommendedTime}
                </span>
              </div>

              {slot1Post ? (
                <div className="mt-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#FAF7F2] line-clamp-1">
                      {slot1Post.topic}
                    </h3>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                        CONTENT_STATUS_CONFIGS[slot1Post.draft_status]?.badgeColor ||
                        'bg-[#111110] text-[#C6A76B] border-[#514435]'
                      }`}
                    >
                      {CONTENT_STATUS_CONFIGS[slot1Post.draft_status]?.label}
                    </span>
                  </div>

                  <p className="text-xs text-[#FAF7F2]/80 line-clamp-3 font-mono leading-relaxed bg-[#111110] p-3 rounded-xl border border-[#514435]">
                    {slot1Post.post_body || slot1Post.suggested_angle}
                  </p>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[10px] text-[#C6A76B] bg-[#111110] px-2 py-0.5 rounded border border-[#514435]">
                      {TONE_OPTIONS.find((t) => t.id === slot1Post.tone)?.label || slot1Post.tone}
                    </span>
                    {slot1Post.media_url && (
                      <span
                        className="text-[10px] text-[#2E5A36] bg-[#EAF2EC] px-2 py-0.5 rounded border border-[#C6DEC9] flex items-center gap-1 font-medium"
                        title={slot1Post.media_description || slot1Post.media_url}
                      >
                        <Image className="w-3 h-3" />
                        Media Attached
                      </span>
                    )}
                    {slot1Post.draft_status === 'published' && (
                      <span className="text-[11px] text-[#C6A76B] flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A76B]" />
                        Published
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center justify-center text-center p-4">
                  <p className="text-xs text-[#FAF7F2] font-semibold">Slot 1 is unassigned</p>
                  <p className="text-[11px] text-[#FAF7F2]/60 mt-1 max-w-xs">
                    Tuesday mornings represent peak tech LinkedIn reader activity.
                  </p>
                  <button
                    onClick={() => handleOpenNewDraftForSlot(weeklySlots[0].dateStr, 1)}
                    className="mt-3.5 px-4 py-2 bg-[#111110] border border-[#C6A76B]/40 hover:bg-[#C6A76B]/15 text-[#C6A76B] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C6A76B]" />
                    Schedule Tuesday Post
                  </button>
                </div>
              )}
            </div>

            {slot1Post && (
              <div className="flex items-center justify-between pt-3 border-t border-[#514435] mt-4 relative z-10">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEditPost(slot1Post)}
                    className="p-1.5 rounded-lg hover:bg-[#514435]/40 text-[#FAF7F2]/70 hover:text-[#FAF7F2] transition-colors text-xs flex items-center gap-1 font-medium"
                    title="Edit Draft"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => deletePost(slot1Post.id)}
                    className="p-1.5 rounded-lg hover:bg-[#FCEEEE]/20 text-[#FAF7F2]/70 hover:text-[#942F2F] transition-colors text-xs flex items-center gap-1"
                    title="Delete Post"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {slot1Post.draft_status === 'published' ? (
                    <button
                      onClick={() => handleOpenMetrics(slot1Post)}
                      className="px-3.5 py-1.5 bg-[#111110] hover:bg-[#514435]/50 text-[#C6A76B] border border-[#C6A76B]/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#C6A76B]" />
                      Log Metrics
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPublish(slot1Post)}
                      className="px-3.5 py-1.5 bg-[#C6A76B] hover:bg-[#D4B87D] text-[#1C1B19] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Publish Manual
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Slot 2: Thursday */}
          <div className="p-5 bg-[#1C1B19] border border-[#C6A76B]/40 rounded-2xl flex flex-col justify-between min-h-[230px] shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between pb-3 border-b border-[#514435]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9C7B4C]"></span>
                  <span className="font-semibold text-sm text-[#FAF7F2]">
                    Slot 2 • Thursday
                  </span>
                  <span className="text-xs text-[#FAF7F2]/60">
                    ({formatSlotDate(weeklySlots[1].dateStr)})
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#111110] text-[#C6A76B] border border-[#C6A76B]/30">
                  {weeklySlots[1].recommendedTime}
                </span>
              </div>

              {slot2Post ? (
                <div className="mt-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#FAF7F2] line-clamp-1">
                      {slot2Post.topic}
                    </h3>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                        CONTENT_STATUS_CONFIGS[slot2Post.draft_status]?.badgeColor ||
                        'bg-[#111110] text-[#C6A76B] border-[#514435]'
                      }`}
                    >
                      {CONTENT_STATUS_CONFIGS[slot2Post.draft_status]?.label}
                    </span>
                  </div>

                  <p className="text-xs text-[#FAF7F2]/80 line-clamp-3 font-mono leading-relaxed bg-[#111110] p-3 rounded-xl border border-[#514435]">
                    {slot2Post.post_body || slot2Post.suggested_angle}
                  </p>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-[10px] text-[#C6A76B] bg-[#111110] px-2 py-0.5 rounded border border-[#514435]">
                      {TONE_OPTIONS.find((t) => t.id === slot2Post.tone)?.label || slot2Post.tone}
                    </span>
                    {slot2Post.media_url && (
                      <span
                        className="text-[10px] text-[#2E5A36] bg-[#EAF2EC] px-2 py-0.5 rounded border border-[#C6DEC9] flex items-center gap-1 font-medium"
                        title={slot2Post.media_description || slot2Post.media_url}
                      >
                        <Image className="w-3 h-3" />
                        Media Attached
                      </span>
                    )}
                    {slot2Post.draft_status === 'published' && (
                      <span className="text-[11px] text-[#C6A76B] flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A76B]" />
                        Published
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center justify-center text-center p-4">
                  <p className="text-xs text-[#FAF7F2] font-semibold">Slot 2 is unassigned</p>
                  <p className="text-[11px] text-[#FAF7F2]/60 mt-1 max-w-xs">
                    Thursday mornings are ideal for technical breakdown stories and tutorials.
                  </p>
                  <button
                    onClick={() => handleOpenNewDraftForSlot(weeklySlots[1].dateStr, 2)}
                    className="mt-3.5 px-4 py-2 bg-[#111110] border border-[#C6A76B]/40 hover:bg-[#C6A76B]/15 text-[#C6A76B] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C6A76B]" />
                    Schedule Thursday Post
                  </button>
                </div>
              )}
            </div>

            {slot2Post && (
              <div className="flex items-center justify-between pt-3 border-t border-[#514435] mt-4 relative z-10">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEditPost(slot2Post)}
                    className="p-1.5 rounded-lg hover:bg-[#514435]/40 text-[#FAF7F2]/70 hover:text-[#FAF7F2] transition-colors text-xs flex items-center gap-1 font-medium"
                    title="Edit Draft"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => deletePost(slot2Post.id)}
                    className="p-1.5 rounded-lg hover:bg-[#FCEEEE]/20 text-[#FAF7F2]/70 hover:text-[#942F2F] transition-colors text-xs flex items-center gap-1"
                    title="Delete Post"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {slot2Post.draft_status === 'published' ? (
                    <button
                      onClick={() => handleOpenMetrics(slot2Post)}
                      className="px-3.5 py-1.5 bg-[#111110] hover:bg-[#514435]/50 text-[#C6A76B] border border-[#C6A76B]/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#C6A76B]" />
                      Log Metrics
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPublish(slot2Post)}
                      className="px-3.5 py-1.5 bg-[#C6A76B] hover:bg-[#D4B87D] text-[#1C1B19] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Publish Manual
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filterable Posts List & Backlog */}
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-6 space-y-4 shadow-sm">
        {/* Header & Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[#292722]">All Planned Posts & Pipeline</h2>
            <span className="text-xs text-[#73685B]">({posts.length} total)</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filterStatus === 'all'
                  ? 'bg-[#292722] text-[#FAF7F2] shadow-sm'
                  : 'bg-[#FAF7F2] text-[#73685B] hover:text-[#292722] border border-[#D9CFC2]'
              }`}
            >
              All ({posts.length})
            </button>
            {(['idea', 'draft', 'approved', 'published', 'cancelled'] as ContentStatus[]).map(
              (status) => {
                const count = posts.filter((p) => p.draft_status === status).length
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                      filterStatus === status
                        ? 'bg-[#292722] text-[#FAF7F2] shadow-sm'
                        : 'bg-[#FAF7F2] text-[#73685B] hover:text-[#292722] border border-[#D9CFC2]'
                    }`}
                  >
                    {CONTENT_STATUS_CONFIGS[status].label} ({count})
                  </button>
                )
              }
            )}
          </div>
        </div>

        {/* Post List */}
        {filteredPosts.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#D9CFC2] rounded-2xl space-y-2 bg-[#F4EEE6]/50">
            <p className="text-sm font-semibold text-[#292722]">No posts found in this view.</p>
            <p className="text-xs text-[#73685B]">
              Create a new draft or click an empty weekly slot above to plan your content.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => {
              const engRate = calculateEngagementRate(
                post.impressions,
                post.reactions,
                post.comments,
                post.reposts
              )

              return (
                <div
                  key={post.id}
                  className="p-4 bg-[#F4EEE6] border border-[#D9CFC2] rounded-2xl hover:border-[#B49A7D] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[#292722]">{post.topic}</h3>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                          CONTENT_STATUS_CONFIGS[post.draft_status]?.badgeColor ||
                          'bg-[#E8DFD3] text-[#73685B] border-[#D9CFC2]'
                        }`}
                      >
                        {CONTENT_STATUS_CONFIGS[post.draft_status]?.label}
                      </span>
                      {post.scheduled_date && (
                        <span className="text-[11px] text-[#73685B] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#73685B]" />
                          {formatSlotDate(post.scheduled_date)} (Slot {post.slot_number})
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#73685B] line-clamp-2 font-mono">
                      {post.post_body || post.suggested_angle}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-[#73685B] bg-[#E8DFD3] px-2 py-0.5 rounded border border-[#D9CFC2]">
                        {TONE_OPTIONS.find((t) => t.id === post.tone)?.label || post.tone}
                      </span>

                      {post.suggested_hashtags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] text-[#73685B]">
                          {tag}
                        </span>
                      ))}

                      {post.media_url && (
                        <span
                          className="text-[10px] text-[#2E5A36] bg-[#EAF2EC] px-2 py-0.5 rounded border border-[#C6DEC9] flex items-center gap-1 font-medium"
                          title={post.media_description || post.media_url}
                        >
                          <Image className="w-3 h-3" />
                          Media Attached
                        </span>
                      )}

                      {post.draft_status === 'published' && post.impressions > 0 && (
                        <div className="flex items-center gap-3 text-xs text-[#73685B] pl-2 border-l border-[#D9CFC2]">
                          <span className="flex items-center gap-1 font-medium">
                            <Eye className="w-3 h-3 text-[#73685B]" />
                            {post.impressions}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Heart className="w-3 h-3 text-[#942F2F]" />
                            {post.reactions}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <MessageSquare className="w-3 h-3 text-[#8A5A20]" />
                            {post.comments}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Repeat2 className="w-3 h-3 text-[#2E5A36]" />
                            {post.reposts}
                          </span>
                          <span className="text-[#292722] font-semibold">{engRate}% rate</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEditPost(post)}
                      className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] hover:bg-[#E8DFD3] text-[#292722] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>

                    {post.draft_status === 'published' ? (
                      <button
                        onClick={() => handleOpenMetrics(post)}
                        className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] hover:bg-[#E8DFD3] text-[#292722] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-[#73685B]" />
                        Metrics
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenPublish(post)}
                        className="px-3.5 py-1.5 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Publish
                      </button>
                    )}

                    <button
                      onClick={() => deletePost(post.id)}
                      className="p-1.5 text-[#73685B] hover:text-[#942F2F] transition-colors"
                      title="Delete Post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <PostDraftModal
        key={editingPost ? editingPost.id : `${draftDefaultDate}-${draftDefaultSlot}`}
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        initialPost={editingPost}
        defaultDate={draftDefaultDate}
        defaultSlot={draftDefaultSlot}
        onSave={handleSaveDraft}
        profile={profile}
      />

      <ManualPublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        post={publishingPost}
        onConfirmPublished={markPublished}
      />

      <PerformanceMetricsModal
        key={metricsPost?.id || 'metrics'}
        isOpen={isMetricsModalOpen}
        onClose={() => setIsMetricsModalOpen(false)}
        post={metricsPost}
        onSaveMetrics={updateMetrics}
      />
    </div>
  )
}
