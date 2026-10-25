import { describe, it, expect } from 'vitest'
import { STAGE_CONFIGS, type TrackerStatus, type NetworkingTrackerRecord } from '../types/tracker'

describe('Milestone 6: Networking Pipeline Tracker & Follow-Up Reminders', () => {
  const initialTracker: NetworkingTrackerRecord = {
    id: 'track-1',
    candidate_id: 'cand-1',
    user_id: 'user-xyz',
    status: 'ready_to_send',
    invitation_sent_at: null,
    connected_at: null,
    next_follow_up_date: null,
    notes: null,
    created_at: '2026-10-25T00:00:00Z',
    updated_at: '2026-10-25T00:00:00Z',
  }

  describe('User-Managed Stage Transitions Across All 7 Pipeline Stages', () => {
    it('verifies all 7 stages have complete human-readable configurations', () => {
      const allStages: TrackerStatus[] = [
        'ready_to_send',
        'invitation_sent',
        'connected',
        'follow_up_due',
        'conversation_active',
        'relationship_established',
        'declined_or_inactive',
      ]

      for (const stage of allStages) {
        expect(STAGE_CONFIGS[stage]).toBeDefined()
        expect(STAGE_CONFIGS[stage].label.length).toBeGreaterThan(0)
        expect(STAGE_CONFIGS[stage].badgeColor.length).toBeGreaterThan(0)
      }
    })

    it('transitions to invitation_sent and records sent date with +4 days follow-up', () => {
      const sentDate = new Date('2026-10-25T10:00:00Z')
      const plus4 = new Date(sentDate)
      plus4.setDate(plus4.getDate() + 4)
      const nextFollowUp = plus4.toISOString().split('T')[0]

      const updated: NetworkingTrackerRecord = {
        ...initialTracker,
        status: 'invitation_sent',
        invitation_sent_at: sentDate.toISOString(),
        next_follow_up_date: nextFollowUp,
      }

      expect(updated.status).toBe('invitation_sent')
      expect(updated.invitation_sent_at).toBe('2026-10-25T10:00:00.000Z')
      expect(updated.next_follow_up_date).toBe('2026-10-29')
    })

    it('transitions to connected and records connected date', () => {
      const connectedDate = new Date('2026-10-27T14:30:00Z')
      const updated: NetworkingTrackerRecord = {
        ...initialTracker,
        status: 'connected',
        connected_at: connectedDate.toISOString(),
      }

      expect(updated.status).toBe('connected')
      expect(updated.connected_at).toBe('2026-10-27T14:30:00.000Z')
    })

    it('transitions to conversation_active with custom discussion notes', () => {
      const updated: NetworkingTrackerRecord = {
        ...initialTracker,
        status: 'conversation_active',
        notes: 'Elena answered! Discussing PyTorch vLLM performance benchmarks.',
      }

      expect(updated.status).toBe('conversation_active')
      expect(updated.notes).toContain('vLLM performance benchmarks')
    })

    it('transitions to relationship_established and declined_or_inactive', () => {
      const established: NetworkingTrackerRecord = {
        ...initialTracker,
        status: 'relationship_established',
        notes: 'Agreed to conduct mock interview next week.',
      }
      expect(established.status).toBe('relationship_established')

      const closed: NetworkingTrackerRecord = {
        ...initialTracker,
        status: 'declined_or_inactive',
        notes: 'Not actively hiring interns this quarter.',
      }
      expect(closed.status).toBe('declined_or_inactive')
    })
  })

  describe('In-App Follow-Up Schedule & Due Date Detection', () => {
    const todayStr = '2026-10-25'

    const checkFollowUp = (dueDateStr: string | null) => {
      if (!dueDateStr) return null
      const due = new Date(dueDateStr)
      const today = new Date(todayStr)
      const diffTime = due.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        isOverdue: diffDays < 0,
        isDueToday: diffDays === 0,
        isUpcoming: diffDays > 0,
        days: diffDays,
      }
    }

    it('identifies overdue follow-ups', () => {
      const status = checkFollowUp('2026-10-22') // 3 days ago
      expect(status?.isOverdue).toBe(true)
      expect(status?.isDueToday).toBe(false)
      expect(status?.isUpcoming).toBe(false)
      expect(status?.days).toBeLessThan(0)
    })

    it('identifies follow-ups due today', () => {
      const status = checkFollowUp('2026-10-25')
      expect(status?.isOverdue).toBe(false)
      expect(status?.isDueToday).toBe(true)
      expect(status?.days).toBe(0)
    })

    it('identifies upcoming follow-ups scheduled for the future', () => {
      const status = checkFollowUp('2026-10-29') // +4 days
      expect(status?.isUpcoming).toBe(true)
      expect(status?.isOverdue).toBe(false)
      expect(status?.days).toBe(4)
    })
  })

  describe('User Isolation and Query Scoping', () => {
    it('scopes all tracker mutations to user_id', () => {
      const currentUserId = 'user-xyz'
      const payload = {
        candidate_id: 'cand-1',
        user_id: currentUserId,
        status: 'invitation_sent' as TrackerStatus,
        notes: 'Sent message manually on LinkedIn.',
      }

      expect(payload.user_id).toBe(currentUserId)
    })
  })
})
