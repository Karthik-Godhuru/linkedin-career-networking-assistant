import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { extractErrorMessage } from './useCareerProfile'
import type { OutreachDrafts, ConnectionMessageRecord } from '../types/outreach'

export function useOutreachMessages() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Record<string, ConnectionMessageRecord>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('connection_messages')
        .select('*')
        .eq('user_id', user.id)

      if (fetchErr) throw fetchErr

      if (data) {
        const msgMap: Record<string, ConnectionMessageRecord> = {}
        for (const row of data) {
          // Attempt to parse JSON follow-ups if stored in draft_template
          let followUp1 = (row as Record<string, unknown>).follow_up_1 as string | undefined
          let followUp2 = (row as Record<string, unknown>).follow_up_2 as string | undefined
          let rawDraft = row.draft_template

          try {
            if (rawDraft.startsWith('{') && rawDraft.includes('"invite"')) {
              const parsed = JSON.parse(rawDraft)
              rawDraft = parsed.invite || rawDraft
              followUp1 = followUp1 || parsed.follow_up_1
              followUp2 = followUp2 || parsed.follow_up_2
            }
          } catch {
            // Not a JSON template, use as-is
          }

          msgMap[row.candidate_id] = {
            id: row.id,
            candidate_id: row.candidate_id,
            user_id: row.user_id,
            draft_template: rawDraft,
            user_edited_text: row.user_edited_text,
            character_count: row.character_count || rawDraft.length,
            tone: row.tone || 'professional_warm',
            follow_up_1: followUp1,
            follow_up_2: followUp2,
            created_at: row.created_at,
            updated_at: row.updated_at,
          }
        }
        setMessages(msgMap)
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load saved connection messages')
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
          .from('connection_messages')
          .select('*')
          .eq('user_id', user.id)

        if (!isSubscribed) return
        if (fetchErr) {
          setError(extractErrorMessage(fetchErr, 'Failed to load connection messages'))
        } else if (data) {
          const msgMap: Record<string, ConnectionMessageRecord> = {}
          for (const row of data) {
            let followUp1 = (row as Record<string, unknown>).follow_up_1 as string | undefined
            let followUp2 = (row as Record<string, unknown>).follow_up_2 as string | undefined
            let rawDraft = row.draft_template

            try {
              if (rawDraft.startsWith('{') && rawDraft.includes('"invite"')) {
                const parsed = JSON.parse(rawDraft)
                rawDraft = parsed.invite || rawDraft
                followUp1 = followUp1 || parsed.follow_up_1
                followUp2 = followUp2 || parsed.follow_up_2
              }
            } catch {
              // Plain text template
            }

            msgMap[row.candidate_id] = {
              id: row.id,
              candidate_id: row.candidate_id,
              user_id: row.user_id,
              draft_template: rawDraft,
              user_edited_text: row.user_edited_text,
              character_count: row.character_count || rawDraft.length,
              tone: row.tone || 'professional_warm',
              follow_up_1: followUp1,
              follow_up_2: followUp2,
              created_at: row.created_at,
              updated_at: row.updated_at,
            }
          }
          setMessages(msgMap)
        }
      } catch (err: unknown) {
        if (!isSubscribed) return
        setError(extractErrorMessage(err, 'Failed to load connection messages'))
      } finally {
        if (isSubscribed) setLoading(false)
      }
    }

    load()
    return () => {
      isSubscribed = false
    }
  }, [user])

  const saveOutreachDrafts = async (
    candidateId: string,
    drafts: OutreachDrafts,
    userEditedNote?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      const msg = 'Authentication required to save outreach drafts'
      setError(msg)
      return { success: false, error: msg }
    }

    setSavingId(candidateId)
    setError(null)

    const noteToSave = (userEditedNote ?? drafts.inviteNote).trim()
    const charCount = Math.min(300, noteToSave.length)

    // Store follow-ups encoded inside JSON payload in draft_template for backward compatibility
    const structuredPayload = JSON.stringify({
      invite: drafts.inviteNote,
      follow_up_1: drafts.followUp1,
      follow_up_2: drafts.followUp2,
    })

    const recordToUpsert = {
      candidate_id: candidateId,
      user_id: user.id,
      draft_template: structuredPayload,
      user_edited_text: noteToSave,
      character_count: charCount,
      tone: drafts.tone,
      updated_at: new Date().toISOString(),
    }

    // Optimistically update local message state
    setMessages((prev) => ({
      ...prev,
      [candidateId]: {
        candidate_id: candidateId,
        user_id: user.id,
        draft_template: drafts.inviteNote,
        user_edited_text: noteToSave,
        character_count: charCount,
        tone: drafts.tone,
        follow_up_1: drafts.followUp1,
        follow_up_2: drafts.followUp2,
        updated_at: new Date().toISOString(),
      },
    }))

    if (!isSupabaseConfigured()) {
      setSavingId(null)
      return { success: true }
    }

    try {
      const { error: upsertErr } = await supabase
        .from('connection_messages')
        .upsert(recordToUpsert, { onConflict: 'candidate_id' })

      if (upsertErr) {
        const errorMsg = extractErrorMessage(upsertErr, 'Failed to save connection message draft')
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      await fetchMessages()
      return { success: true }
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err, 'Failed to save connection message draft')
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setSavingId(null)
    }
  }

  const getMessageForCandidate = (candidateId: string): ConnectionMessageRecord | undefined => {
    return messages[candidateId]
  }

  return {
    messages,
    loading,
    savingId,
    error,
    saveOutreachDrafts,
    getMessageForCandidate,
    refetch: fetchMessages,
  }
}
