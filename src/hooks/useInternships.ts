import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { useCareerProfile } from './useCareerProfile'
import { extractErrorMessage } from './useCareerProfile'
import type { InternshipRecord, InternshipRawInput, InternshipStatus } from '../types/internship'
import type { Database } from '../types/database'
import {
  buildEvaluatedInternship,
  calculateInternshipRelevance,
  detectWorkMode,
} from '../services/internshipMatchingEngine'
import { normalizeProfileUrl } from '../lib/hash'
import { SAMPLE_INTERNSHIPS } from '../services/sampleInternships'

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

function getSevenDaysLaterDateString(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export function useInternships() {
  const { user } = useAuth()
  const { profile } = useCareerProfile()

  const [internships, setInternships] = useState<InternshipRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchInternships = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      // In offline/mock mode, initialize with sample internships evaluated against user profile
      const evaluated = SAMPLE_INTERNSHIPS.map((raw) =>
        buildEvaluatedInternship(raw, user.id, profile)
      )
      setInternships(evaluated)
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('internships')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr

      if (data && data.length > 0) {
        const loaded: InternshipRecord[] = data.map((row) => {
          const evalResult = calculateInternshipRelevance(
            {
              title: row.title,
              company: row.company,
              location: row.location || undefined,
              posting_url: row.posting_url,
              source: row.source,
              required_skills: row.required_skills || [],
              deadline: row.deadline,
              notes: row.notes,
            },
            profile
          )

          return {
            id: row.id,
            user_id: row.user_id,
            title: row.title,
            company: row.company,
            location: row.location,
            work_mode: detectWorkMode(row.location || ''),
            posting_url: row.posting_url,
            source: row.source,
            required_skills: row.required_skills || [],
            match_score: row.match_score ?? evalResult.matchScore,
            match_reasons: (row.match_reasons as any) || evalResult.matchReasons,
            missing_skills: evalResult.missingSkills,
            status: row.status as InternshipStatus,
            deadline: row.deadline,
            applied_at: row.applied_at,
            notes: row.notes,
            created_at: row.created_at,
          }
        })
        setInternships(loaded)
      } else {
        // If user has zero internships saved yet, load evaluated sample opportunities
        const samples = SAMPLE_INTERNSHIPS.map((raw) =>
          buildEvaluatedInternship(raw, user.id, profile)
        )
        setInternships(samples)
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load internship opportunities')
      setError(msg)
      // Fallback to sample items for demonstration
      const samples = SAMPLE_INTERNSHIPS.map((raw) =>
        buildEvaluatedInternship(raw, user.id, profile)
      )
      setInternships(samples)
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    let isSubscribed = true

    async function load() {
      if (!user) {
        if (isSubscribed) setLoading(false)
        return
      }

      if (!isSupabaseConfigured()) {
        const evaluated = SAMPLE_INTERNSHIPS.map((raw) =>
          buildEvaluatedInternship(raw, user.id, profile)
        )
        if (isSubscribed) {
          setInternships(evaluated)
          setLoading(false)
        }
        return
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from('internships')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (!isSubscribed) return

        if (fetchErr) throw fetchErr

        if (data && data.length > 0) {
          const loaded: InternshipRecord[] = data.map((row) => {
            const evalResult = calculateInternshipRelevance(
              {
                title: row.title,
                company: row.company,
                location: row.location || undefined,
                posting_url: row.posting_url,
                source: row.source,
                required_skills: row.required_skills || [],
                deadline: row.deadline,
                notes: row.notes,
              },
              profile
            )

            return {
              id: row.id,
              user_id: row.user_id,
              title: row.title,
              company: row.company,
              location: row.location,
              work_mode: detectWorkMode(row.location || ''),
              posting_url: row.posting_url,
              source: row.source,
              required_skills: row.required_skills || [],
              match_score: row.match_score ?? evalResult.matchScore,
              match_reasons: (row.match_reasons as any) || evalResult.matchReasons,
              missing_skills: evalResult.missingSkills,
              status: row.status as InternshipStatus,
              deadline: row.deadline,
              applied_at: row.applied_at,
              notes: row.notes,
              created_at: row.created_at,
            }
          })
          setInternships(loaded)
        } else {
          const samples = SAMPLE_INTERNSHIPS.map((raw) =>
            buildEvaluatedInternship(raw, user.id, profile)
          )
          setInternships(samples)
        }
      } catch (err: unknown) {
        if (!isSubscribed) return
        const msg = extractErrorMessage(err, 'Failed to load internship opportunities')
        setError(msg)
        const samples = SAMPLE_INTERNSHIPS.map((raw) =>
          buildEvaluatedInternship(raw, user.id, profile)
        )
        setInternships(samples)
      } finally {
        if (isSubscribed) setLoading(false)
      }
    }

    load()

    return () => {
      isSubscribed = false
    }
  }, [user, profile])

  /**
   * Adds a single internship opportunity with duplicate detection by URL.
   */
  const addInternship = async (rawInput: InternshipRawInput): Promise<{ success: boolean; error?: string; record?: InternshipRecord }> => {
    if (!user) {
      return { success: false, error: 'User must be authenticated to save opportunities' }
    }

    const normalizedUrl = normalizeProfileUrl(rawInput.posting_url)
    const isDuplicate = internships.some(
      (item) => normalizeProfileUrl(item.posting_url) === normalizedUrl
    )

    if (isDuplicate) {
      return { success: false, error: 'This opportunity URL has already been imported or saved.' }
    }

    setError(null)
    const newRecord = buildEvaluatedInternship(rawInput, user.id, profile)

    // Optimistically update
    setInternships((prev) => [newRecord, ...prev])

    if (!isSupabaseConfigured()) {
      setSuccessMessage(`Opportunity at ${newRecord.company} saved!`)
      return { success: true, record: newRecord }
    }

    try {
      const payload = {
        id: newRecord.id,
        user_id: user.id,
        title: newRecord.title,
        company: newRecord.company,
        location: newRecord.location,
        posting_url: newRecord.posting_url,
        source: newRecord.source,
        required_skills: newRecord.required_skills,
        match_score: newRecord.match_score,
        match_reasons: newRecord.match_reasons as any,
        status: newRecord.status,
        deadline: newRecord.deadline,
        applied_at: newRecord.applied_at,
        notes: newRecord.notes,
      }

      const { error: insertErr } = await supabase.from('internships').insert(payload)
      if (insertErr) {
        // Rollback on failure
        setInternships((prev) => prev.filter((i) => i.id !== newRecord.id))
        const msg = extractErrorMessage(insertErr, 'Failed to save internship to database')
        setError(msg)
        return { success: false, error: msg }
      }

      setSuccessMessage(`Opportunity at ${newRecord.company} saved to tracker!`)
      return { success: true, record: newRecord }
    } catch (err: unknown) {
      setInternships((prev) => prev.filter((i) => i.id !== newRecord.id))
      const msg = extractErrorMessage(err, 'Failed to save internship to database')
      setError(msg)
      return { success: false, error: msg }
    }
  }

  /**
   * Batch imports opportunities (e.g. from CSV or sample list).
   */
  const importBatch = async (rawList: InternshipRawInput[]): Promise<{ importedCount: number; duplicateCount: number }> => {
    if (!user) return { importedCount: 0, duplicateCount: 0 }

    let imported = 0
    let duplicates = 0
    const toAdd: InternshipRecord[] = []

    for (const raw of rawList) {
      const norm = normalizeProfileUrl(raw.posting_url)
      const existsInState = internships.some((i) => normalizeProfileUrl(i.posting_url) === norm)
      const existsInBatch = toAdd.some((i) => normalizeProfileUrl(i.posting_url) === norm)

      if (existsInState || existsInBatch) {
        duplicates++
      } else {
        toAdd.push(buildEvaluatedInternship(raw, user.id, profile))
        imported++
      }
    }

    if (toAdd.length === 0) {
      return { importedCount: 0, duplicateCount: duplicates }
    }

    setInternships((prev) => [...toAdd, ...prev])

    if (isSupabaseConfigured()) {
      try {
        const payloads = toAdd.map((item) => ({
          id: item.id,
          user_id: user.id,
          title: item.title,
          company: item.company,
          location: item.location,
          posting_url: item.posting_url,
          source: item.source,
          required_skills: item.required_skills,
          match_score: item.match_score,
          match_reasons: item.match_reasons as any,
          status: item.status,
          deadline: item.deadline,
          applied_at: item.applied_at,
          notes: item.notes,
        }))

        await supabase.from('internships').insert(payloads)
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Failed to persist batch import')
        setError(msg)
      }
    }

    setSuccessMessage(`Imported ${imported} opportunities (${duplicates} duplicates skipped)`)
    return { importedCount: imported, duplicateCount: duplicates }
  }

  /**
   * Updates an existing internship's status, deadlines, interview date or personal notes.
   */
  const updateInternship = async (
    id: string,
    updates: Partial<InternshipRecord>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' }

    setSavingId(id)
    setError(null)

    const prevList = [...internships]
    const target = internships.find((i) => i.id === id)
    if (!target) {
      setSavingId(null)
      return { success: false, error: 'Record not found' }
    }

    // Auto-stamp applied_at if status transitions to applied and not set
    let appliedAt = updates.applied_at ?? target.applied_at
    if (updates.status === 'applied' && !appliedAt) {
      appliedAt = new Date().toISOString()
    }

    const updatedRecord: InternshipRecord = {
      ...target,
      ...updates,
      applied_at: appliedAt,
      updated_at: new Date().toISOString(),
    }

    // Optimistic state update
    setInternships((prev) => prev.map((item) => (item.id === id ? updatedRecord : item)))

    if (!isSupabaseConfigured()) {
      setSavingId(null)
      return { success: true }
    }

    try {
      const payload: Database['public']['Tables']['internships']['Update'] = {
        title: updatedRecord.title,
        company: updatedRecord.company,
        location: updatedRecord.location,
        status: updatedRecord.status,
        deadline: updatedRecord.deadline,
        applied_at: updatedRecord.applied_at,
        notes: updatedRecord.notes,
      }

      const { error: updateErr } = await supabase
        .from('internships')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)

      if (updateErr) {
        setInternships(prevList)
        const msg = extractErrorMessage(updateErr, 'Failed to update application status')
        setError(msg)
        return { success: false, error: msg }
      }

      return { success: true }
    } catch (err: unknown) {
      setInternships(prevList)
      const msg = extractErrorMessage(err, 'Failed to update application status')
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setSavingId(null)
    }
  }

  /**
   * Deletes an opportunity record.
   */
  const deleteInternship = async (id: string): Promise<boolean> => {
    if (!user) return false
    const prevList = [...internships]
    setInternships((prev) => prev.filter((i) => i.id !== id))

    if (!isSupabaseConfigured()) return true

    try {
      const { error: delErr } = await supabase
        .from('internships')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (delErr) {
        setInternships(prevList)
        setError(extractErrorMessage(delErr, 'Failed to remove opportunity'))
        return false
      }
      return true
    } catch {
      setInternships(prevList)
      return false
    }
  }

  // Summary counts and deadline buckets
  const metrics = useMemo(() => {
    const today = getTodayDateString()
    const sevenDaysFromNow = getSevenDaysLaterDateString()

    let savedCount = 0
    let appliedCount = 0
    let interviewCount = 0
    let offerCount = 0
    let overdueCount = 0
    let upcomingDeadlineCount = 0

    for (const item of internships) {
      if (item.status === 'bookmarked' || item.status === 'discovered') savedCount++
      if (item.status === 'applied') appliedCount++
      if (item.status === 'assessment' || item.status === 'interviewing') interviewCount++
      if (item.status === 'offered') offerCount++

      if (item.deadline) {
        if (item.deadline < today && item.status !== 'applied' && item.status !== 'offered' && item.status !== 'rejected') {
          overdueCount++
        } else if (item.deadline >= today && item.deadline <= sevenDaysFromNow) {
          upcomingDeadlineCount++
        }
      }
    }

    return {
      total: internships.length,
      savedCount,
      appliedCount,
      interviewCount,
      offerCount,
      overdueCount,
      upcomingDeadlineCount,
    }
  }, [internships])

  return {
    internships,
    loading,
    savingId,
    error,
    successMessage,
    clearError: () => setError(null),
    clearSuccess: () => setSuccessMessage(null),
    addInternship,
    importBatch,
    updateInternship,
    deleteInternship,
    refetch: fetchInternships,
    metrics,
  }
}
