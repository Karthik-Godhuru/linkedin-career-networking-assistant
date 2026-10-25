import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import {
  careerProfileSchema,
  type CareerProfileFormData,
} from '../types/profile'
import type { Database } from '../types/database'

type ProfileRow = Database['public']['Tables']['user_career_profiles']['Row']
type ProfileInsert = Database['public']['Tables']['user_career_profiles']['Insert']

const INITIAL_PROFILE: CareerProfileFormData = {
  target_roles: ['AI/ML Engineer', 'Python Developer'],
  target_companies: [],
  target_skills: ['Python', 'Machine Learning', 'React'],
  target_locations: ['Remote'],
  alumni_institutions: [],
  experience_level: 'student_intern',
  bio_summary: '',
}

/**
 * Extracts a descriptive, sanitized error message from standard JS Errors,
 * Supabase PostgrestError objects, or fallback strings without leaking tokens or keys.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback

  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>
    const message = typeof errorObj.message === 'string' ? errorObj.message.trim() : ''
    const code = typeof errorObj.code === 'string' ? errorObj.code.trim() : ''
    const details = typeof errorObj.details === 'string' ? errorObj.details.trim() : ''

    if (message) {
      // Include the Postgres/PostgREST error code if available for clear diagnosis
      return code && !message.includes(code) ? `[${code}] ${message}` : message
    }

    if (details) {
      return details
    }
  }

  if (err instanceof Error && err.message) {
    return err.message
  }

  if (typeof err === 'string' && err.trim()) {
    return err.trim()
  }

  return fallback
}

export function useCareerProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<CareerProfileFormData>(INITIAL_PROFILE)
  const [recordMeta, setRecordMeta] = useState<{ id?: string; updated_at?: string }>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)

  const fetchProfile = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('user_career_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchErr) {
        throw fetchErr
      }

      if (data) {
        const row = data as ProfileRow
        const parsed = careerProfileSchema.safeParse({
          target_roles: row.target_roles || [],
          target_companies: row.target_companies || [],
          target_skills: row.target_skills || [],
          target_locations: row.target_locations || [],
          alumni_institutions: row.alumni_institutions || [],
          experience_level: row.experience_level || 'student_intern',
          bio_summary: row.bio_summary || '',
        })

        if (parsed.success) {
          setProfile(parsed.data)
          setRecordMeta({ id: row.id, updated_at: row.updated_at })
        }
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load career profile')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    let isSubscribed = true

    async function loadInitial() {
      if (!user || !isSupabaseConfigured()) {
        return
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from('user_career_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!isSubscribed) return

        if (fetchErr) {
          setError(extractErrorMessage(fetchErr, 'Failed to load career profile'))
        } else if (data) {
          const row = data as ProfileRow
          const parsed = careerProfileSchema.safeParse({
            target_roles: row.target_roles || [],
            target_companies: row.target_companies || [],
            target_skills: row.target_skills || [],
            target_locations: row.target_locations || [],
            alumni_institutions: row.alumni_institutions || [],
            experience_level: row.experience_level || 'student_intern',
            bio_summary: row.bio_summary || '',
          })

          if (parsed.success) {
            setProfile(parsed.data)
            setRecordMeta({ id: row.id, updated_at: row.updated_at })
          }
        }
      } catch (err: unknown) {
        if (!isSubscribed) return
        const msg = extractErrorMessage(err, 'Failed to load career profile')
        setError(msg)
      } finally {
        if (isSubscribed) {
          setLoading(false)
        }
      }
    }

    loadInitial()

    return () => {
      isSubscribed = false
    }
  }, [user])

  const saveProfile = async (
    formData: CareerProfileFormData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      const msg = 'User session is required to save preferences'
      setError(msg)
      return { success: false, error: msg }
    }

    const validation = careerProfileSchema.safeParse(formData)
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Invalid profile data'
      setError(firstError)
      return { success: false, error: firstError }
    }

    setSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const validData = validation.data
      const payload: ProfileInsert = {
        user_id: user.id,
        target_roles: validData.target_roles,
        target_companies: validData.target_companies,
        target_skills: validData.target_skills,
        target_locations: validData.target_locations,
        alumni_institutions: validData.alumni_institutions,
        experience_level: validData.experience_level,
        bio_summary: validData.bio_summary || null,
        updated_at: new Date().toISOString(),
      }

      const { data, error: upsertErr } = await supabase
        .from('user_career_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()

      if (upsertErr) {
        throw upsertErr
      }

      setProfile(validData)
      if (data) {
        const row = data as ProfileRow
        setRecordMeta({ id: row.id, updated_at: row.updated_at })
      }
      setSaveSuccess(true)
      return { success: true }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to save career profile')
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setSaving(false)
    }
  }

  const clearStatus = () => {
    setError(null)
    setSaveSuccess(false)
  }

  return {
    profile,
    recordMeta,
    loading,
    saving,
    error,
    saveSuccess,
    saveProfile,
    refetch: fetchProfile,
    clearStatus,
  }
}
