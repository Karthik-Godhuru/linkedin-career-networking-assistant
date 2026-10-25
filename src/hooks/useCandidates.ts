import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { useCareerProfile } from './useCareerProfile'
import { computeDuplicateHash } from '../lib/hash'
import { calculateRelevance, enrichWithGemini } from '../services/matchingEngine'
import { extractErrorMessage } from './useCareerProfile'
import type {
  CandidateRecord,
  CandidateRawInput,
  CandidateStatus,
  MatchReason,
} from '../types/candidate'
import type { Database, Json } from '../types/database'

type CandidateRow = Database['public']['Tables']['candidates']['Row']
type CandidateInsert = Database['public']['Tables']['candidates']['Insert']

export interface IngestResult {
  added: number
  skippedDuplicates: number
  total: number
}

export function useCandidates() {
  const { user } = useAuth()
  const { profile: userProfile } = useCareerProfile()
  const [candidates, setCandidates] = useState<CandidateRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [ingesting, setIngesting] = useState<boolean>(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCandidates = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user.id)
        .order('match_score', { ascending: false, nullsFirst: false })

      if (fetchErr) {
        throw fetchErr
      }

      if (data) {
        const rows = data as CandidateRow[]
        const formatted: CandidateRecord[] = rows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          full_name: r.full_name,
          headline: r.headline,
          current_company: r.current_company,
          location: r.location,
          profile_url: r.profile_url,
          source: r.source,
          category: r.category,
          duplicate_hash: r.duplicate_hash,
          match_score: r.match_score,
          match_reasons: (Array.isArray(r.match_reasons) ? r.match_reasons : []) as unknown as MatchReason[],
          status: r.status,
          created_at: r.created_at,
        }))
        setCandidates(formatted)
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load candidate recommendations')
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
          .from('candidates')
          .select('*')
          .eq('user_id', user.id)
          .order('match_score', { ascending: false, nullsFirst: false })

        if (!isSubscribed) return

        if (fetchErr) {
          setError(extractErrorMessage(fetchErr, 'Failed to load candidate recommendations'))
        } else if (data) {
          const rows = data as CandidateRow[]
          const formatted: CandidateRecord[] = rows.map((r) => ({
            id: r.id,
            user_id: r.user_id,
            full_name: r.full_name,
            headline: r.headline,
            current_company: r.current_company,
            location: r.location,
            profile_url: r.profile_url,
            source: r.source,
            category: r.category,
            duplicate_hash: r.duplicate_hash,
            match_score: r.match_score,
            match_reasons: (Array.isArray(r.match_reasons) ? r.match_reasons : []) as unknown as MatchReason[],
            status: r.status,
            created_at: r.created_at,
          }))
          setCandidates(formatted)
        }
      } catch (err: unknown) {
        if (!isSubscribed) return
        const msg = extractErrorMessage(err, 'Failed to load candidate recommendations')
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

  /**
   * Evaluates, scores, deduplicates, and persists a batch of candidates.
   */
  const ingestCandidates = async (
    rawCandidates: CandidateRawInput[]
  ): Promise<{ success: boolean; result?: IngestResult; error?: string }> => {
    if (!user) {
      const msg = 'User authentication required to ingest candidates'
      setError(msg)
      return { success: false, error: msg }
    }

    if (rawCandidates.length === 0) {
      return { success: true, result: { added: 0, skippedDuplicates: 0, total: 0 } }
    }

    setIngesting(true)
    setError(null)

    try {
      const recordsToInsert: CandidateInsert[] = []
      const existingHashes = new Set(candidates.map((c) => c.duplicate_hash))
      let duplicateCount = 0

      for (const raw of rawCandidates) {
        const hash = await computeDuplicateHash(raw.profile_url)

        if (existingHashes.has(hash)) {
          duplicateCount++
          continue
        }

        // Calculate transparent relevance match
        const evalResult = calculateRelevance(raw, userProfile)

        // Try Gemini enrichment if available
        let finalReasons = evalResult.matchReasons
        const geminiAngle = await enrichWithGemini(raw, userProfile)
        if (geminiAngle) {
          finalReasons = [
            ...finalReasons,
            { category: 'general', text: `AI Angle: ${geminiAngle}`, weight: 10 },
          ]
        }

        recordsToInsert.push({
          user_id: user.id,
          full_name: raw.full_name,
          headline: raw.headline || null,
          current_company: raw.current_company || null,
          location: raw.location || null,
          profile_url: raw.profile_url,
          source: raw.source,
          category: raw.category || evalResult.category,
          duplicate_hash: hash,
          match_score: evalResult.matchScore,
          match_reasons: finalReasons as unknown as Json,
          status: 'pending',
          created_at: new Date().toISOString(),
        })

        existingHashes.add(hash)
      }

      if (recordsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('candidates')
          .upsert(recordsToInsert, { onConflict: 'user_id, duplicate_hash' })

        if (insertErr) {
          throw insertErr
        }

        await fetchCandidates()
      }

      return {
        success: true,
        result: {
          added: recordsToInsert.length,
          skippedDuplicates: duplicateCount,
          total: rawCandidates.length,
        },
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to save discovered candidates')
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setIngesting(false)
    }
  }

  /**
   * Updates review decision for a single candidate with RLS user isolation.
   */
  const updateCandidateStatus = async (
    candidateId: string,
    newStatus: CandidateStatus
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      const msg = 'User authentication required to update candidate status'
      setError(msg)
      return { success: false, error: msg }
    }

    setUpdatingId(candidateId)
    setError(null)

    // Save snapshot for potential rollback on network/server error
    const prevCandidates = [...candidates]
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
    )

    if (!isSupabaseConfigured()) {
      setUpdatingId(null)
      return { success: true }
    }

    try {
      const { error: updateErr } = await supabase
        .from('candidates')
        .update({ status: newStatus })
        .eq('id', candidateId)
        .eq('user_id', user.id)

      if (updateErr) {
        // Rollback optimistic state
        setCandidates(prevCandidates)
        const errorMsg = extractErrorMessage(updateErr, 'Failed to update candidate review decision')
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      return { success: true }
    } catch (err: unknown) {
      setCandidates(prevCandidates)
      const errorMsg = extractErrorMessage(err, 'Failed to update candidate review decision')
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setUpdatingId(null)
    }
  }

  return {
    candidates,
    loading,
    ingesting,
    updatingId,
    error,
    ingestCandidates,
    updateCandidateStatus,
    refetch: fetchCandidates,
  }
}
