import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { extractErrorMessage } from './useCareerProfile'
import type {
  ContentRecommendationRecord,
  ContentPlanInput,
  ContentStatus,
  ContentTone,
} from '../types/contentPlanner'
import {
  getMondayOfWeek,
  addDays,
  toLocalDateString,
  checkPublishingReminders,
  type SlotReminderNotification,
} from '../utils/plannerUtils'

// Mock initial data if working without Supabase connection
const MOCK_STORAGE_KEY = 'linkedin_assistant_mock_content_posts'

function getInitialLocalPosts(): ContentRecommendationRecord[] {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Ignore storage parse errors
  }
  return []
}

function saveLocalPosts(posts: ContentRecommendationRecord[]) {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(posts))
  } catch {
    // Ignore storage save errors
  }
}

function getTodayLocalDate(): string {
  return toLocalDateString(new Date())
}

function getInitialWeekMonday(): string {
  return getMondayOfWeek(new Date())
}

export function useContentPlanner() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<ContentRecommendationRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeWeekMonday, setActiveWeekMonday] = useState<string>(getInitialWeekMonday)

  const fetchPosts = useCallback(async () => {
    if (!user) {
      setPosts([])
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setPosts(getInitialLocalPosts())
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error: fetchErr } = await supabase
        .from('content_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchErr) {
        throw fetchErr
      }

      if (data) {
        const mapped: ContentRecommendationRecord[] = data.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          topic: row.topic,
          suggested_angle: row.suggested_angle,
          suggested_hashtags: Array.isArray(row.suggested_hashtags)
            ? row.suggested_hashtags
            : [],
          target_audience: row.target_audience,
          draft_status: (row.draft_status as ContentStatus) || 'idea',
          post_body: row.post_body ?? null,
          source_material: row.source_material ?? null,
          tone: (row.tone as ContentTone) || 'insightful_technical',
          scheduled_date: row.scheduled_date ?? null,
          slot_number: row.slot_number ?? 1,
          published_at: row.published_at ?? null,
          impressions: row.impressions ?? 0,
          reactions: row.reactions ?? 0,
          comments: row.comments ?? 0,
          reposts: row.reposts ?? 0,
          media_url: row.media_url ?? null,
          media_description: row.media_description ?? null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }))
        setPosts(mapped)
        setError(null)
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load content posts')
      setError(msg)
      // Fallback to local storage cache if offline or unapplied migration
      const local = getInitialLocalPosts()
      if (local.length > 0) {
        setPosts(local)
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    let isSubscribed = true

    async function load() {
      if (!user) {
        if (isSubscribed) {
          setPosts([])
          setLoading(false)
        }
        return
      }

      if (!isSupabaseConfigured()) {
        if (isSubscribed) {
          setPosts(getInitialLocalPosts())
          setLoading(false)
        }
        return
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from('content_recommendations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (!isSubscribed) return

        if (fetchErr) {
          const msg = extractErrorMessage(fetchErr, 'Failed to load content posts')
          setError(msg)
          const local = getInitialLocalPosts()
          if (local.length > 0) setPosts(local)
        } else if (data) {
          const mapped: ContentRecommendationRecord[] = data.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            topic: row.topic,
            suggested_angle: row.suggested_angle,
            suggested_hashtags: Array.isArray(row.suggested_hashtags)
              ? row.suggested_hashtags
              : [],
            target_audience: row.target_audience,
            draft_status: (row.draft_status as ContentStatus) || 'idea',
            post_body: row.post_body ?? null,
            source_material: row.source_material ?? null,
            tone: (row.tone as ContentTone) || 'insightful_technical',
            scheduled_date: row.scheduled_date ?? null,
            slot_number: row.slot_number ?? 1,
            published_at: row.published_at ?? null,
            impressions: row.impressions ?? 0,
            reactions: row.reactions ?? 0,
            comments: row.comments ?? 0,
            reposts: row.reposts ?? 0,
            media_url: row.media_url ?? null,
            media_description: row.media_description ?? null,
            created_at: row.created_at,
            updated_at: row.updated_at,
          }))
          setPosts(mapped)
          setError(null)
        }
      } catch (err: unknown) {
        if (!isSubscribed) return
        const msg = extractErrorMessage(err, 'Failed to load content posts')
        setError(msg)
        const local = getInitialLocalPosts()
        if (local.length > 0) setPosts(local)
      } finally {
        if (isSubscribed) setLoading(false)
      }
    }

    void load()

    return () => {
      isSubscribed = false
    }
  }, [user])

  // Week navigation
  const goToPreviousWeek = useCallback(() => {
    setActiveWeekMonday((prev) => addDays(prev, -7))
  }, [])

  const goToNextWeek = useCallback(() => {
    setActiveWeekMonday((prev) => addDays(prev, 7))
  }, [])

  const goToCurrentWeek = useCallback(() => {
    setActiveWeekMonday(getInitialWeekMonday())
  }, [])

  // Create post
  const createPost = useCallback(
    async (input: ContentPlanInput): Promise<ContentRecommendationRecord | null> => {
      if (!user) {
        setError('You must be logged in to create content plans')
        return null
      }

      const newPostId = input.id || (crypto.randomUUID ? crypto.randomUUID() : `post-${Date.now()}`)
      const newRecord: ContentRecommendationRecord = {
        id: newPostId,
        user_id: user.id,
        topic: input.topic,
        suggested_angle: input.suggested_angle,
        suggested_hashtags: input.suggested_hashtags || [],
        target_audience: input.target_audience || null,
        draft_status: input.draft_status || 'idea',
        post_body: input.post_body || null,
        source_material: input.source_material || null,
        tone: input.tone || 'insightful_technical',
        scheduled_date: input.scheduled_date || null,
        slot_number: input.slot_number ?? 1,
        published_at: null,
        impressions: 0,
        reactions: 0,
        comments: 0,
        reposts: 0,
        media_url: input.media_url || null,
        media_description: input.media_description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (!isSupabaseConfigured()) {
        const updated = [newRecord, ...posts]
        setPosts(updated)
        saveLocalPosts(updated)
        return newRecord
      }

      try {
        const { data, error: insertErr } = await supabase
          .from('content_recommendations')
          .insert({
            id: newRecord.id,
            user_id: user.id,
            topic: newRecord.topic,
            suggested_angle: newRecord.suggested_angle,
            suggested_hashtags: newRecord.suggested_hashtags,
            target_audience: newRecord.target_audience,
            draft_status: newRecord.draft_status,
            post_body: newRecord.post_body,
            source_material: newRecord.source_material,
            tone: newRecord.tone,
            scheduled_date: newRecord.scheduled_date,
            slot_number: newRecord.slot_number,
            published_at: newRecord.published_at,
            impressions: newRecord.impressions,
            reactions: newRecord.reactions,
            comments: newRecord.comments,
            reposts: newRecord.reposts,
            media_url: newRecord.media_url,
            media_description: newRecord.media_description,
          })
          .select()
          .single()

        if (insertErr) throw insertErr

        const created: ContentRecommendationRecord = {
          id: data.id,
          user_id: data.user_id,
          topic: data.topic,
          suggested_angle: data.suggested_angle,
          suggested_hashtags: Array.isArray(data.suggested_hashtags)
            ? data.suggested_hashtags
            : [],
          target_audience: data.target_audience,
          draft_status: (data.draft_status as ContentStatus) || 'idea',
          post_body: data.post_body ?? null,
          source_material: data.source_material ?? null,
          tone: (data.tone as ContentTone) || 'insightful_technical',
          scheduled_date: data.scheduled_date ?? null,
          slot_number: data.slot_number ?? 1,
          published_at: data.published_at ?? null,
          impressions: data.impressions ?? 0,
          reactions: data.reactions ?? 0,
          comments: data.comments ?? 0,
          reposts: data.reposts ?? 0,
          media_url: data.media_url ?? null,
          media_description: data.media_description ?? null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        }

        setPosts((prev) => [created, ...prev])
        return created
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Failed to save post to database')
        setError(msg)
        // Optimistic / fallback save locally so user does not lose their draft
        const updated = [newRecord, ...posts]
        setPosts(updated)
        saveLocalPosts(updated)
        return newRecord
      }
    },
    [user, posts]
  )

  // Update post
  const updatePost = useCallback(
    async (id: string, updates: Partial<ContentPlanInput>): Promise<boolean> => {
      if (!user) return false

      const targetPost = posts.find((p) => p.id === id)
      if (!targetPost) return false

      const updatedRecord: ContentRecommendationRecord = {
        ...targetPost,
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Optimistic update
      setPosts((prev) => prev.map((p) => (p.id === id ? updatedRecord : p)))

      if (!isSupabaseConfigured()) {
        const updated = posts.map((p) => (p.id === id ? updatedRecord : p))
        saveLocalPosts(updated)
        return true
      }

      try {
        const { error: updateErr } = await supabase
          .from('content_recommendations')
          .update({
            ...(updates.topic !== undefined && { topic: updates.topic }),
            ...(updates.suggested_angle !== undefined && {
              suggested_angle: updates.suggested_angle,
            }),
            ...(updates.suggested_hashtags !== undefined && {
              suggested_hashtags: updates.suggested_hashtags,
            }),
            ...(updates.target_audience !== undefined && {
              target_audience: updates.target_audience,
            }),
            ...(updates.draft_status !== undefined && {
              draft_status: updates.draft_status,
            }),
            ...(updates.post_body !== undefined && { post_body: updates.post_body }),
            ...(updates.source_material !== undefined && {
              source_material: updates.source_material,
            }),
            ...(updates.tone !== undefined && { tone: updates.tone }),
            ...(updates.scheduled_date !== undefined && {
              scheduled_date: updates.scheduled_date,
            }),
            ...(updates.slot_number !== undefined && {
              slot_number: updates.slot_number,
            }),
            ...(updates.media_url !== undefined && {
              media_url: updates.media_url,
            }),
            ...(updates.media_description !== undefined && {
              media_description: updates.media_description,
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)

        if (updateErr) throw updateErr
        return true
      } catch (err: unknown) {
        setError(extractErrorMessage(err, 'Failed to update post'))
        return false
      }
    },
    [user, posts]
  )

  // Reschedule post
  const reschedulePost = useCallback(
    async (id: string, newDate: string, slotNumber: number): Promise<boolean> => {
      return updatePost(id, {
        scheduled_date: newDate,
        slot_number: slotNumber,
      })
    },
    [updatePost]
  )

  // Delete post
  const deletePost = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false

      // Optimistic update
      const filtered = posts.filter((p) => p.id !== id)
      setPosts(filtered)
      saveLocalPosts(filtered)

      if (!isSupabaseConfigured()) return true

      try {
        const { error: delErr } = await supabase
          .from('content_recommendations')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (delErr) throw delErr
        return true
      } catch (err: unknown) {
        setError(extractErrorMessage(err, 'Failed to delete post'))
        // Re-fetch to restore accurate state
        fetchPosts()
        return false
      }
    },
    [user, posts, fetchPosts]
  )

  // Mark published
  const markPublished = useCallback(
    async (id: string, publishedAt?: string): Promise<boolean> => {
      if (!user) return false
      const timestamp = publishedAt || new Date().toISOString()

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, draft_status: 'published' as ContentStatus, published_at: timestamp }
            : p
        )
      )

      if (!isSupabaseConfigured()) return true

      try {
        const { error: pubErr } = await supabase
          .from('content_recommendations')
          .update({
            draft_status: 'published',
            published_at: timestamp,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)

        if (pubErr) throw pubErr
        return true
      } catch (err: unknown) {
        setError(extractErrorMessage(err, 'Failed to mark post as published'))
        return false
      }
    },
    [user]
  )

  // Update engagement metrics
  const updateMetrics = useCallback(
    async (
      id: string,
      metrics: {
        impressions: number
        reactions: number
        comments: number
        reposts: number
      }
    ): Promise<boolean> => {
      if (!user) return false

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                impressions: metrics.impressions,
                reactions: metrics.reactions,
                comments: metrics.comments,
                reposts: metrics.reposts,
              }
            : p
        )
      )

      if (!isSupabaseConfigured()) return true

      try {
        const { error: metricErr } = await supabase
          .from('content_recommendations')
          .update({
            impressions: metrics.impressions,
            reactions: metrics.reactions,
            comments: metrics.comments,
            reposts: metrics.reposts,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)

        if (metricErr) throw metricErr
        return true
      } catch (err: unknown) {
        setError(extractErrorMessage(err, 'Failed to record performance metrics'))
        return false
      }
    },
    [user]
  )

  // Calculate in-app reminders
  const reminders: SlotReminderNotification[] = useMemo(() => {
    return checkPublishingReminders(posts, getTodayLocalDate())
  }, [posts])

  return {
    posts,
    loading,
    error,
    activeWeekMonday,
    setActiveWeekMonday,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    createPost,
    updatePost,
    reschedulePost,
    deletePost,
    markPublished,
    updateMetrics,
    refresh: fetchPosts,
    reminders,
  }
}
