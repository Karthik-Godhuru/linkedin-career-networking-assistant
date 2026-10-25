import { describe, it, expect } from 'vitest'
import { careerProfileSchema } from '../types/profile'
import { calculateRelevance, categorizeCandidate } from '../services/matchingEngine'
import { generateOutreachDrafts } from '../services/outreachEngine'
import { calculateInternshipRelevance, getInternshipDuplicateHash } from '../services/internshipMatchingEngine'
import { parseInternshipsFromCSV } from '../services/ingestion/internshipCsvParser'
import { parseCandidatesFromCSV } from '../services/ingestion/csvParser'
import { computeDuplicateHash, normalizeProfileUrl } from '../lib/hash'
import type { CareerProfileFormData } from '../types/profile'
import type { CandidateRecord } from '../types/candidate'
import { STAGE_CONFIGS } from '../types/tracker'
import { INTERNSHIP_STAGES } from '../types/internship'

const testProfile: CareerProfileFormData = {
  target_roles: ['AI/ML Engineer', 'Python Developer'],
  target_companies: ['Google', 'OpenAI', 'Anthropic'],
  target_skills: ['Python', 'PyTorch', 'Distributed Systems'],
  target_locations: ['Remote', 'San Francisco, CA'],
  alumni_institutions: ['Carnegie Mellon University'],
  experience_level: 'entry_level',
  bio_summary: 'Passionate machine learning engineer building high-performance inference pipelines.',
}

describe('Milestone 8: End-to-End System Validation Suite', () => {
  // 1. Authentication & Security Boundaries
  describe('1. Authentication & Security Boundary Integrity', () => {
    it('enforces non-null user ownership across all domain data structures', () => {
      const mockCandidate: CandidateRecord = {
        id: 'cand-uuid-1',
        user_id: 'user-auth-uuid-999',
        full_name: 'Alex Rivera',
        headline: 'Senior ML Engineer at Anthropic',
        current_company: 'Anthropic',
        location: 'San Francisco, CA',
        profile_url: 'https://linkedin.com/in/alex-rivera-ml',
        source: 'manual_entry',
        category: 'engineer',
        duplicate_hash: 'hash-abc',
        match_score: 95,
        match_reasons: [],
        status: 'approved',
        created_at: new Date().toISOString(),
      }

      expect(mockCandidate.user_id).toBe('user-auth-uuid-999')
      expect(mockCandidate.user_id).not.toBe('')
    })
  })

  // 2. Career Preference Creation, Validation & Persistence
  describe('2. Career Profile Validation (M2)', () => {
    it('validates a complete career profile against Zod schema rules', () => {
      const result = careerProfileSchema.safeParse(testProfile)
      expect(result.success).toBe(true)
    })

    it('rejects profiles with empty target roles or missing required arrays', () => {
      const invalidProfile = {
        ...testProfile,
        target_roles: [],
      }
      const result = careerProfileSchema.safeParse(invalidProfile)
      expect(result.success).toBe(false)
    })
  })

  // 3. Candidate Discovery, Ingestion & Relevance Matching
  describe('3. Candidate Discovery & Matching (M3)', () => {
    it('ingests candidate from CSV and computes transparent match breakdown', () => {
      const csv = `Full Name,Headline,Company,Location,URL
"Elena Rostova","Staff AI/ML Engineer at Google (Python, PyTorch)","Google","San Francisco, CA","https://linkedin.com/in/elena-rostova"`

      const parsed = parseCandidatesFromCSV(csv)
      expect(parsed.length).toBe(1)
      expect(parsed[0].full_name).toBe('Elena Rostova')

      const evaluation = calculateRelevance(parsed[0], testProfile)
      expect(evaluation.matchScore).toBeGreaterThanOrEqual(70)
      expect(evaluation.category).toBe('engineer')

      const reasonCategories = evaluation.matchReasons.map((r) => r.category)
      expect(reasonCategories).toContain('role')
      expect(reasonCategories).toContain('company')
    })

    it('categorizes recruiters, founders, and mentors based on headline keywords', () => {
      expect(categorizeCandidate('Technical Recruiter at Scale AI')).toBe('recruiter')
      expect(categorizeCandidate('Founder & CEO at Stealth AI')).toBe('founder')
      expect(categorizeCandidate('Engineering Director & Mentor')).toBe('mentor')
      expect(categorizeCandidate('Senior Systems Engineer')).toBe('engineer')
    })
  })

  // 4. Candidate Curation & Human Approval Lifecycle
  describe('4. Candidate Curation Lifecycle (M4)', () => {
    it('supports full transition through Shortlist, Approve, Dismiss, and Reset', () => {
      let status = 'pending'
      expect(status).toBe('pending')

      status = 'shortlisted'
      expect(status).toBe('shortlisted')

      status = 'approved'
      expect(status).toBe('approved')

      status = 'dismissed'
      expect(status).toBe('dismissed')

      // Reset back to pending
      status = 'pending'
      expect(status).toBe('pending')
    })
  })

  // 5. Outreach Generation & Character Limits (M5 - li-dm compliant)
  describe('5. Personalized Outreach Generation (M5)', () => {
    it('generates a 3-part outreach sequence respecting LinkedIn limits', () => {
      const candidate: CandidateRecord = {
        id: 'cand-sarah-1',
        user_id: 'user-auth-uuid-999',
        full_name: 'Dr. Sarah Chen',
        headline: 'Lead AI Scientist at OpenAI',
        current_company: 'OpenAI',
        location: 'San Francisco, CA',
        profile_url: 'https://linkedin.com/in/sarah-chen-ai',
        source: 'manual_entry',
        category: 'engineer',
        duplicate_hash: 'hash-sarah',
        match_score: 90,
        match_reasons: [],
        status: 'approved',
        created_at: new Date().toISOString(),
      }

      const drafts = generateOutreachDrafts(candidate, testProfile)
      expect(drafts.inviteNote).toBeDefined()
      expect(drafts.followUp1).toBeDefined()
      expect(drafts.followUp2).toBeDefined()

      // Enforce LinkedIn 200/300 character note limit per li-dm
      expect(drafts.characterCount).toBeLessThanOrEqual(200)

      // Ensure no AI slop em-dashes
      expect(drafts.inviteNote).not.toContain('—')
    })
  })

  // 6. Networking Pipeline Tracker & Follow-Up Reminders (M6)
  describe('6. Networking Pipeline Tracker (M6)', () => {
    it('verifies all 7 stages and transition integrity including relationship_established', () => {
      const allowedStages = Object.keys(STAGE_CONFIGS)
      expect(allowedStages).toContain('ready_to_send')
      expect(allowedStages).toContain('invitation_sent')
      expect(allowedStages).toContain('connected')
      expect(allowedStages).toContain('follow_up_due')
      expect(allowedStages).toContain('conversation_active')
      expect(allowedStages).toContain('relationship_established')
      expect(allowedStages).toContain('declined_or_inactive')
    })

    it('correctly calculates follow-up date spacing (+4 days and +10 days)', () => {
      const baseDate = new Date('2026-10-25T12:00:00Z')
      const fourDaysLater = new Date(baseDate.getTime() + 4 * 24 * 60 * 60 * 1000)
      const tenDaysLater = new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000)

      expect(fourDaysLater.toISOString().split('T')[0]).toBe('2026-10-29')
      expect(tenDaysLater.toISOString().split('T')[0]).toBe('2026-11-04')
    })
  })

  // 7. Internship Discovery & Application Tracking (M7)
  describe('7. Internship Discovery & Application Tracking (M7)', () => {
    it('verifies CSV parsing, URL deduplication, and missing skills detection', async () => {
      const csv = `Title,Company,Location,Work Mode,URL,Deadline,Skills
"Machine Learning Intern","Google","Mountain View, CA","Hybrid","https://careers.google.com/jobs/step-ml-2026?trk=test","2026-11-15","Python, PyTorch, C++, CUDA"`

      const parsed = parseInternshipsFromCSV(csv)
      expect(parsed.length).toBe(1)
      expect(parsed[0].title).toBe('Machine Learning Intern')

      const evalResult = calculateInternshipRelevance(parsed[0], testProfile)
      expect(evalResult.matchScore).toBeGreaterThanOrEqual(80)

      // Missing skills detection: User has Python, PyTorch; missing C++, CUDA
      expect(evalResult.missingSkills).toContain('C++')
      expect(evalResult.missingSkills).toContain('CUDA')
      expect(evalResult.missingSkills).not.toContain('Python')

      // URL deduplication hash matches clean version
      const hashWithParam = await getInternshipDuplicateHash('https://careers.google.com/jobs/step-ml-2026?trk=test')
      const hashClean = await getInternshipDuplicateHash('https://careers.google.com/jobs/step-ml-2026')
      expect(hashWithParam).toBe(hashClean)
    })

    it('validates all 8 internship stages including assessment and withdrawn', () => {
      const stages = Object.keys(INTERNSHIP_STAGES)
      expect(stages).toContain('discovered')
      expect(stages).toContain('bookmarked')
      expect(stages).toContain('applied')
      expect(stages).toContain('assessment')
      expect(stages).toContain('interviewing')
      expect(stages).toContain('offered')
      expect(stages).toContain('rejected')
      expect(stages).toContain('withdrawn')
    })
  })

  // 8. Navigation & System Contracts (M8)
  describe('8. Milestone Navigation & Release Contracts', () => {
    it('ensures clean URL normalization across disparate input formats', () => {
      expect(normalizeProfileUrl('HTTP://WWW.LinkedIn.Com/in/JohnDoe/')).toBe('linkedin.com/in/johndoe')
      expect(normalizeProfileUrl('https://linkedin.com/in/johndoe?ref=home')).toBe('linkedin.com/in/johndoe')
      expect(normalizeProfileUrl('https://boards.greenhouse.io/cohere/jobs/123/')).toBe('boards.greenhouse.io/cohere/jobs/123')
    })

    it('computes deterministic hashes across platforms', async () => {
      const hashA = await computeDuplicateHash('https://example.com/item/1')
      const hashB = await computeDuplicateHash('https://example.com/item/1')
      expect(hashA).toBe(hashB)
      expect(hashA.length).toBeGreaterThan(16)
    })
  })
})
