import { describe, it, expect } from 'vitest'
import { generateOutreachDrafts } from '../services/outreachEngine'
import type { CandidateRecord } from '../types/candidate'
import type { CareerProfileFormData } from '../types/profile'

describe('Milestone 5: Personalized Outreach & Message Generation Engine', () => {
  const mockProfile: CareerProfileFormData = {
    target_roles: ['AI/ML Engineer', 'Python Developer'],
    target_companies: ['Google DeepMind', 'Anthropic', 'vLLM Labs'],
    target_skills: ['Python', 'PyTorch', 'vLLM'],
    target_locations: ['San Francisco', 'Remote'],
    alumni_institutions: ['Stanford University'],
    experience_level: 'student_intern',
    bio_summary: 'Aspiring AI researcher focused on distributed PyTorch inference.',
  }

  const candidateEngineer: CandidateRecord = {
    id: 'cand-eng-1',
    user_id: 'user-abc',
    full_name: 'Elena Vance',
    headline: 'Senior ML Engineer | Distributed PyTorch & Inference',
    current_company: 'vLLM Labs',
    location: 'San Francisco',
    profile_url: 'https://linkedin.com/in/elena-vance-sample',
    source: 'csv_import',
    category: 'engineer',
    duplicate_hash: 'hash-elena',
    match_score: 92,
    match_reasons: [{ category: 'skill', text: 'Technical overlap in PyTorch', weight: 25 }],
    status: 'approved',
    created_at: '2026-10-24T10:00:00Z',
  }

  const candidateRecruiter: CandidateRecord = {
    id: 'cand-rec-1',
    user_id: 'user-abc',
    full_name: 'David Miller',
    headline: 'University Talent Lead & Technical Recruiter',
    current_company: 'Scale AI',
    location: 'Remote',
    profile_url: 'https://linkedin.com/in/david-miller-recruiter',
    source: 'csv_import',
    category: 'recruiter',
    duplicate_hash: 'hash-david',
    match_score: 85,
    match_reasons: [{ category: 'role', text: 'Matches target recruiter', weight: 30 }],
    status: 'approved',
    created_at: '2026-10-24T10:05:00Z',
  }

  const candidateAlum: CandidateRecord = {
    id: 'cand-alum-1',
    user_id: 'user-abc',
    full_name: 'Dr. Priya Sharma',
    headline: 'Senior AI Researcher & Stanford Alum',
    current_company: 'Google DeepMind',
    location: 'San Francisco',
    profile_url: 'https://linkedin.com/in/priya-sharma-deepmind',
    source: 'csv_import',
    category: 'alumni',
    duplicate_hash: 'hash-priya',
    match_score: 88,
    match_reasons: [{ category: 'alumni', text: 'Shared academic network (Stanford)', weight: 15 }],
    status: 'approved',
    created_at: '2026-10-24T10:10:00Z',
  }

  describe('Strict Character Limits & li-dm Formula Enforcement', () => {
    it('enforces invite notes to be under 200 characters including spaces', () => {
      const draftsEng = generateOutreachDrafts(candidateEngineer, mockProfile)
      const draftsRec = generateOutreachDrafts(candidateRecruiter, mockProfile)
      const draftsAlum = generateOutreachDrafts(candidateAlum, mockProfile)

      expect(draftsEng.inviteNote.length).toBeLessThanOrEqual(200)
      expect(draftsEng.characterCount).toBe(draftsEng.inviteNote.length)

      expect(draftsRec.inviteNote.length).toBeLessThanOrEqual(200)
      expect(draftsAlum.inviteNote.length).toBeLessThanOrEqual(200)
    })

    it('never opens with banned AI cliché "I hope this message finds you well"', () => {
      const drafts = generateOutreachDrafts(candidateEngineer, mockProfile)
      expect(drafts.inviteNote.toLowerCase()).not.toContain('hope this message finds you well')
      expect(drafts.followUp1.toLowerCase()).not.toContain('hope this message finds you well')
      expect(drafts.followUp2.toLowerCase()).not.toContain('hope this message finds you well')
    })

    it('contains no sales pitch or calendar links in invite note', () => {
      const drafts = generateOutreachDrafts(candidateEngineer, mockProfile)
      expect(drafts.inviteNote.toLowerCase()).not.toContain('calendly')
      expect(drafts.inviteNote.toLowerCase()).not.toContain('calendar')
      expect(drafts.inviteNote.toLowerCase()).not.toContain('hop on a call')
      expect(drafts.inviteNote.toLowerCase()).not.toContain('are you hiring')
    })
  })

  describe('Factual Grounding (No Hallucinations)', () => {
    it('references genuine company engineering work without inventing claims', () => {
      const drafts = generateOutreachDrafts(candidateEngineer, mockProfile)
      expect(drafts.inviteNote).toContain('vLLM Labs')
      expect(drafts.inviteNote).toContain('AI/ML Engineer')
    })

    it('references verified campus alumni network when candidate is classified as alumni', () => {
      const drafts = generateOutreachDrafts(candidateAlum, mockProfile)
      expect(drafts.inviteNote).toContain('Stanford University')
      expect(drafts.inviteNote).toContain('Google DeepMind')
    })

    it('incorporates user-provided custom context when supplied', () => {
      const customFact = 'Read your technical blog post on distributed tensor parallelism.'
      const drafts = generateOutreachDrafts(candidateEngineer, mockProfile, customFact)
      expect(drafts.inviteNote).toContain('distributed tensor parallelism')
      expect(drafts.hookReason).toContain('User provided')
      expect(drafts.inviteNote.length).toBeLessThanOrEqual(200)
    })
  })

  describe('Structured Follow-Up Sequence (+4 Days and +10 Days)', () => {
    it('generates two follow-ups with appropriate spacing and content', () => {
      const drafts = generateOutreachDrafts(candidateEngineer, mockProfile)

      // Follow-up 1: give something before asking, small ask
      expect(drafts.followUp1.length).toBeGreaterThan(30)
      expect(drafts.followUp1).toContain('Elena')
      expect(drafts.followUp1.toLowerCase()).not.toContain('just bumping')
      expect(drafts.followUp1.toLowerCase()).not.toContain('following up on my last')

      // Follow-up 2: close the loop politely without pressure
      expect(drafts.followUp2.length).toBeGreaterThan(20)
      expect(drafts.followUp2).toContain('close the loop')
      expect(drafts.followUp2).toContain('vLLM Labs')
    })
  })

  describe('Tone Customization', () => {
    it('adjusts phrasing when peer_technical or alumni_academic tone is selected', () => {
      const peerDraft = generateOutreachDrafts(candidateEngineer, mockProfile, '', 'peer_technical')
      const alumniDraft = generateOutreachDrafts(candidateAlum, mockProfile, '', 'alumni_academic')

      expect(peerDraft.tone).toBe('peer_technical')
      expect(peerDraft.inviteNote).toContain('build Python systems')

      expect(alumniDraft.tone).toBe('alumni_academic')
      expect(alumniDraft.inviteNote).toContain('fellow alum')
    })
  })
})
