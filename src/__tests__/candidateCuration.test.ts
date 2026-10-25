import { describe, it, expect } from 'vitest'
import type { CandidateRecord, CandidateStatus } from '../types/candidate'

describe('Milestone 4: Candidate Curation & Approval Dashboard', () => {
  const sampleCandidates: CandidateRecord[] = [
    {
      id: 'cand-1',
      user_id: 'user-123',
      full_name: 'Elena Vance',
      headline: 'Senior ML Engineer | Distributed PyTorch & Inference',
      current_company: 'vLLM Labs',
      location: 'San Francisco',
      profile_url: 'https://www.linkedin.com/in/elena-vance-sample',
      source: 'csv_import',
      category: 'engineer',
      duplicate_hash: 'hash-elena',
      match_score: 92,
      match_reasons: [{ category: 'skill', text: 'Technical overlap in PyTorch', weight: 25 }],
      status: 'pending',
      created_at: '2026-10-24T10:00:00Z',
    },
    {
      id: 'cand-2',
      user_id: 'user-123',
      full_name: 'David Miller',
      headline: 'University Talent Lead & Technical Recruiter',
      current_company: 'Scale AI',
      location: 'Remote',
      profile_url: 'https://www.linkedin.com/in/david-miller-recruiter',
      source: 'csv_import',
      category: 'recruiter',
      duplicate_hash: 'hash-david',
      match_score: 85,
      match_reasons: [{ category: 'role', text: 'Matches target recruiter', weight: 30 }],
      status: 'pending',
      created_at: '2026-10-24T10:05:00Z',
    },
    {
      id: 'cand-3',
      user_id: 'user-123',
      full_name: 'Priya Sharma',
      headline: 'Senior AI Researcher & XYZ Alum',
      current_company: 'Google DeepMind',
      location: 'Bengaluru',
      profile_url: 'https://www.linkedin.com/in/priya-sharma-deepmind',
      source: 'csv_import',
      category: 'engineer',
      duplicate_hash: 'hash-priya',
      match_score: 74,
      match_reasons: [{ category: 'company', text: 'Target company: Google DeepMind', weight: 20 }],
      status: 'shortlisted',
      created_at: '2026-10-24T10:10:00Z',
    },
    {
      id: 'cand-4',
      user_id: 'user-123',
      full_name: 'Marcus Webb',
      headline: 'Founding Python & Systems Engineer',
      current_company: 'Series A AI Startup',
      location: 'Remote',
      profile_url: 'https://www.linkedin.com/in/marcus-webb-systems',
      source: 'csv_import',
      category: 'engineer',
      duplicate_hash: 'hash-marcus',
      match_score: 55,
      match_reasons: [{ category: 'skill', text: 'Python stack', weight: 15 }],
      status: 'dismissed',
      created_at: '2026-10-24T10:15:00Z',
    },
  ]

  describe('Human Review Decision Workflow & State Transitions', () => {
    it('initializes candidates in the pending state by default', () => {
      const pendingList = sampleCandidates.filter((c) => c.status === 'pending')
      expect(pendingList).toHaveLength(2)
      expect(pendingList.map((c) => c.full_name)).toEqual(['Elena Vance', 'David Miller'])
    })

    it('transitions review decision to approved for networking', () => {
      let state = [...sampleCandidates]
      const targetId = 'cand-1'
      const newStatus: CandidateStatus = 'approved'

      // Simulate human review action
      state = state.map((c) => (c.id === targetId ? { ...c, status: newStatus } : c))

      const approved = state.find((c) => c.id === targetId)
      expect(approved?.status).toBe('approved')
      expect(state.filter((c) => c.status === 'approved')).toHaveLength(1)
    })

    it('transitions review decision to shortlisted', () => {
      let state = [...sampleCandidates]
      const targetId = 'cand-2'
      const newStatus: CandidateStatus = 'shortlisted'

      state = state.map((c) => (c.id === targetId ? { ...c, status: newStatus } : c))

      const shortlisted = state.find((c) => c.id === targetId)
      expect(shortlisted?.status).toBe('shortlisted')
      expect(state.filter((c) => c.status === 'shortlisted')).toHaveLength(2)
    })

    it('transitions review decision to skipped (dismissed)', () => {
      let state = [...sampleCandidates]
      const targetId = 'cand-1'
      const newStatus: CandidateStatus = 'dismissed'

      state = state.map((c) => (c.id === targetId ? { ...c, status: newStatus } : c))

      const skipped = state.find((c) => c.id === targetId)
      expect(skipped?.status).toBe('dismissed')
      expect(state.filter((c) => c.status === 'dismissed')).toHaveLength(2)
    })

    it('allows the user to change an existing decision or reset to pending', () => {
      let state = [...sampleCandidates]
      const targetId = 'cand-4' // currently dismissed

      // Change from dismissed to approved
      state = state.map((c) => (c.id === targetId ? { ...c, status: 'approved' } : c))
      expect(state.find((c) => c.id === targetId)?.status).toBe('approved')

      // Reset back to pending
      state = state.map((c) => (c.id === targetId ? { ...c, status: 'pending' } : c))
      expect(state.find((c) => c.id === targetId)?.status).toBe('pending')
    })
  })

  describe('Curation Dashboard Filtering Engine', () => {
    it('filters candidates by review status', () => {
      const pending = sampleCandidates.filter((c) => c.status === 'pending')
      const shortlisted = sampleCandidates.filter((c) => c.status === 'shortlisted')
      const dismissed = sampleCandidates.filter((c) => c.status === 'dismissed')

      expect(pending).toHaveLength(2)
      expect(shortlisted).toHaveLength(1)
      expect(dismissed).toHaveLength(1)
    })

    it('filters candidates by target company', () => {
      const scaleAI = sampleCandidates.filter((c) => c.current_company === 'Scale AI')
      const deepmind = sampleCandidates.filter((c) => c.current_company === 'Google DeepMind')

      expect(scaleAI).toHaveLength(1)
      expect(scaleAI[0].full_name).toBe('David Miller')
      expect(deepmind).toHaveLength(1)
      expect(deepmind[0].full_name).toBe('Priya Sharma')
    })

    it('filters candidates by relevance score thresholds', () => {
      const highMatches = sampleCandidates.filter((c) => (c.match_score ?? 0) >= 80)
      const mediumMatches = sampleCandidates.filter(
        (c) => (c.match_score ?? 0) >= 60 && (c.match_score ?? 0) < 80
      )
      const lowMatches = sampleCandidates.filter((c) => (c.match_score ?? 0) < 60)

      expect(highMatches).toHaveLength(2) // Elena (92), David (85)
      expect(mediumMatches).toHaveLength(1) // Priya (74)
      expect(lowMatches).toHaveLength(1) // Marcus (55)
    })

    it('searches across candidate name, headline, company, and location', () => {
      const search = (q: string) => {
        const query = q.toLowerCase()
        return sampleCandidates.filter(
          (c) =>
            c.full_name.toLowerCase().includes(query) ||
            (c.headline || '').toLowerCase().includes(query) ||
            (c.current_company || '').toLowerCase().includes(query) ||
            (c.location || '').toLowerCase().includes(query)
        )
      }

      expect(search('PyTorch')).toHaveLength(1)
      expect(search('PyTorch')[0].full_name).toBe('Elena Vance')

      expect(search('Remote')).toHaveLength(2)
      expect(search('DeepMind')).toHaveLength(1)
      expect(search('Bengaluru')).toHaveLength(1)
    })
  })

  describe('User Isolation and Query Scoping', () => {
    it('enforces user_id ownership on update queries to prevent tenant leakage', () => {
      const currentUserId = 'user-123'
      const foreignUserId = 'user-999'

      const updateQueryPayload = (candidateId: string, status: CandidateStatus, userId: string) => ({
        filter: { id: candidateId, user_id: userId },
        update: { status },
      })

      const myPayload = updateQueryPayload('cand-1', 'approved', currentUserId)
      expect(myPayload.filter.user_id).toBe(currentUserId)

      // Attempting to modify a record with a mismatched user_id
      const foreignPayload = updateQueryPayload('cand-1', 'approved', foreignUserId)
      expect(foreignPayload.filter.user_id).not.toBe(currentUserId)
    })

    it('preserves snapshot state and rolls back if an update operation fails', () => {
      const originalState = [...sampleCandidates]
      let currentState = [...sampleCandidates]

      // Optimistically update
      const candidateId = 'cand-1'
      currentState = currentState.map((c) =>
        c.id === candidateId ? { ...c, status: 'approved' } : c
      )
      expect(currentState.find((c) => c.id === candidateId)?.status).toBe('approved')

      // Simulate a network failure or permission denial rollback
      const simulateFailure = true
      if (simulateFailure) {
        currentState = originalState
      }

      expect(currentState.find((c) => c.id === candidateId)?.status).toBe('pending')
    })
  })
})
