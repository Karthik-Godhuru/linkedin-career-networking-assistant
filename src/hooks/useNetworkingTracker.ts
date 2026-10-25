import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { extractErrorMessage } from './useCareerProfile'
import type { NetworkingTrackerRecord, TrackerStatus } from '../types/tracker'

export function useNetworkingTracker() {
  const { user } = useAuth()
  const [trackerMap, setTrackerMap] = useState<Record<string, NetworkingTrackerRecord>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchTrackerRecords = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('networking_tracker')
        .select('*')
        .eq('user_id', user.id)

      if (fetchErr) throw fetchErr

      if (data) {
        const map: Record<string, NetworkingTrackerRecord> = {}
        for (const row of data) {
          map[row.candidate_id] = {
            id: row.id,
            candidate_id: row.candidate_id,
            user_id: row.user_id,
            status: row.status as TrackerStatus,
            invitation_sent_at: row.invitation_sent_at,
            connected_at: row.connected_at,
            next_follow_up_date: row.next_follow_up_date,
            notes: row.notes,
            created_at: row.created_at,
            updated_at: row.updated_at,
          }
        }
        setTrackerMap(map)
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load networking tracker records')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    let isSubscribed = true

    async function load() {
      if (!user || !isSupabaseConfigured()) {
        setLoading(false)
        return
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from('networking_tracker')
          .select('*')
          .eq('user_id', user.id)

        if (!isSubscribed) return

        if (fetchErr) {
          setError(extractErrorMessage(fetchErr, 'Failed to load networking tracker records'))
        } else if (data) {
          const map: Record<string, NetworkingTrackerRecord> = {}
          for (const row of data) {
            map[row.candidate_id] = {
              id: row.id,
              candidate_id: row.candidate_id,
              user_id: row.user_id,
              status: row.status as TrackerStatus,
              invitation_sent_at: row.invitation_sent_at,
              connected_at: row.connected_at,
              next_follow_up_date: row.next_follow_up_date,
              notes: row.notes,
              created_at: row.created_at,
              updated_at: row.updated_at,
            }
          }
          setTrackerMap(map)
        }
      } catch (err: unknown) {
        if (!isSubscribed) return
        setError(extractErrorMessage(err, 'Failed to load networking tracker records'))
      } finally {
        if (isSubscribed) setLoading(false)
      }
    }

    load()
    return () => {
      isSubscribed = false
    }
  }, [user])

  /**
   * Returns current tracker record for a candidate or a default 'ready_to_send' record.
   */
  const getTrackerForCandidate = useCallback(
    (candidateId: string): NetworkingTrackerRecord => {
      if (trackerMap[candidateId]) {
        return trackerMap[candidateId]
      }
      return {
        candidate_id: candidateId,
        user_id: user?.id || '',
        status: 'ready_to_send',
        invitation_sent_at: null,
        connected_at: null,
        next_follow_up_date: null,
        notes: null,
      }
    },
    [trackerMap, user]
  )

  /**
   * Updates tracker stage, dates or notes for a candidate.
   * Optimistically updates UI and persists to Supabase with user isolation.
   */
  const updateTracker = async (
    candidateId: string,
    updates: Partial<NetworkingTrackerRecord>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      const msg = 'User authentication required to update pipeline tracking'
      setError(msg)
      return { success: false, error: msg }
    }

    setUpdatingId(candidateId)
    setError(null)

    const prevMap = { ...trackerMap }
    const current = getTrackerForCandidate(candidateId)
    const updatedRecord: NetworkingTrackerRecord = {
      ...current,
      ...updates,
      candidate_id: candidateId,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    // Optimistically update local state
    setTrackerMap((prev) => ({
      ...prev,
      [candidateId]: updatedRecord,
    }))

    if (!isSupabaseConfigured()) {
      setUpdatingId(null)
      return { success: true }
    }

    try {
      const payload = {
        candidate_id: candidateId,
        user_id: user.id,
        status: updatedRecord.status,
        invitation_sent_at: updatedRecord.invitation_sent_at,
        connected_at: updatedRecord.connected_at,
        next_follow_up_date: updatedRecord.next_follow_up_date,
        notes: updatedRecord.notes,
        updated_at: new Date().toISOString(),
      }

      const { error: upsertErr } = await supabase
        .from('networking_tracker')
        .upsert(payload, { onConflict: 'candidate_id' })

      if (upsertErr) {
        // Rollback optimistic update on error
        setTrackerMap(prevMap)
        const errorMsg = extractErrorMessage(upsertErr, 'Failed to save pipeline tracking update')
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      return { success: true }
    } catch (err: unknown) {
      setTrackerMap(prevMap)
      const errorMsg = extractErrorMessage(err, 'Failed to save pipeline tracking update')
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setUpdatingId(null)
    }
  }

  return {
    trackerMap,
    loading,
    updatingId,
    error,
    getTrackerForCandidate,
    updateTracker,
    refetch: fetchTrackerRecords,
  }
}
