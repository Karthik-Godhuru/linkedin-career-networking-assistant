import { describe, it, expect } from 'vitest'
import { normalizeProfileUrl, computeDuplicateHash } from '../lib/hash'
import { calculateRelevance, categorizeCandidate } from '../services/matchingEngine'
import { parseCandidatesFromCSV } from '../services/ingestion/csvParser'
import { buildWebSearchQueries } from '../services/ingestion/webSearchQueryBuilder'
import type { CareerProfileFormData } from '../types/profile'
import type { CandidateRawInput } from '../types/candidate'

describe('Milestone 3: Candidate Discovery & AI Relevance Engine', () => {
  const mockProfile: CareerProfileFormData = {
    target_roles: ['AI/ML Engineer', 'Python Developer'],
    target_companies: ['Google DeepMind', 'Anthropic', 'vLLM Labs'],
    target_skills: ['Python', 'PyTorch', 'React', 'FastAPI'],
    target_locations: ['Remote', 'San Francisco', 'Bengaluru'],
    alumni_institutions: ['XYZ University'],
    experience_level: 'student_intern',
    bio_summary: 'B.Tech CSE student specializing in AI/ML.',
  }

  describe('Deduplication & URL Normalization', () => {
    it('normalizes diverse URL formats to an identical canonical string', () => {
      const u1 = 'https://www.linkedin.com/in/elena-vance/'
      const u2 = 'http://linkedin.com/in/elena-vance?trk=public_profile'
      const u3 = 'linkedin.com/in/elena-vance#skills'
      const u4 = '  https://linkedin.com/in/elena-vance  '

      const n1 = normalizeProfileUrl(u1)
      const n2 = normalizeProfileUrl(u2)
      const n3 = normalizeProfileUrl(u3)
      const n4 = normalizeProfileUrl(u4)

      expect(n1).toBe('linkedin.com/in/elena-vance')
      expect(n2).toBe('linkedin.com/in/elena-vance')
      expect(n3).toBe('linkedin.com/in/elena-vance')
      expect(n4).toBe('linkedin.com/in/elena-vance')
    })

    it('computes identical duplicate hashes for the same profile across URL variations', async () => {
      const u1 = 'https://www.linkedin.com/in/alex-smith/'
      const u2 = 'http://linkedin.com/in/alex-smith?trk=feed'

      const h1 = await computeDuplicateHash(u1)
      const h2 = await computeDuplicateHash(u2)

      expect(h1).toBe(h2)
      expect(h1.length).toBeGreaterThanOrEqual(16)
    })
  })

  describe('Transparent Relevance Matching Engine', () => {
    it('scores high for candidates matching role, skills, company and remote location', () => {
      const candidate: CandidateRawInput = {
        full_name: 'Elena Vance',
        headline: 'Senior AI/ML Engineer | PyTorch & Inference',
        current_company: 'vLLM Labs',
        location: 'Remote',
        profile_url: 'https://linkedin.com/in/elena-vance',
        source: 'csv_import',
      }

      const evaluation = calculateRelevance(candidate, mockProfile)

      expect(evaluation.matchScore).toBeGreaterThanOrEqual(80)
      expect(evaluation.category).toBe('engineer')
      expect(evaluation.matchReasons.some((r) => r.category === 'role')).toBe(true)
      expect(evaluation.matchReasons.some((r) => r.category === 'skill')).toBe(true)
      expect(evaluation.matchReasons.some((r) => r.category === 'company')).toBe(true)
    })

    it('correctly categorizes recruiters, founders and alumni', () => {
      expect(categorizeCandidate('University Technical Recruiter at Scale AI')).toBe('recruiter')
      expect(categorizeCandidate('Co-Founder & CEO at Stealth AI')).toBe('founder')
      expect(categorizeCandidate('VP of Engineering & Mentor')).toBe('mentor')
      expect(categorizeCandidate('Senior Python Developer', true)).toBe('alumni')
      expect(categorizeCandidate('Machine Learning Engineer')).toBe('engineer')
    })

    it('provides transparent reasons with positive weights', () => {
      const candidate: CandidateRawInput = {
        full_name: 'David Miller',
        headline: 'Technical Recruiter hiring AI/ML Engineers',
        current_company: 'Scale AI',
        location: 'San Francisco',
        profile_url: 'https://linkedin.com/in/david-miller',
        source: 'manual_entry',
      }

      const evaluation = calculateRelevance(candidate, mockProfile)
      expect(evaluation.matchReasons.length).toBeGreaterThan(0)
      for (const reason of evaluation.matchReasons) {
        expect(reason.weight).toBeGreaterThan(0)
        expect(reason.text.length).toBeGreaterThan(5)
      }
    })
  })

  describe('CSV Ingestion Parser', () => {
    it('parses valid CSV text into structured CandidateRawInput records', () => {
      const csv = `Full Name,Headline,Company,Location,URL
Priya Sharma,Senior AI Researcher,Google DeepMind,Bengaluru,https://linkedin.com/in/priya-sharma
Marcus Webb,Systems Engineer,Anthropic,Remote,https://linkedin.com/in/marcus-webb`

      const candidates = parseCandidatesFromCSV(csv)
      expect(candidates).toHaveLength(2)
      expect(candidates[0].full_name).toBe('Priya Sharma')
      expect(candidates[0].current_company).toBe('Google DeepMind')
      expect(candidates[0].source).toBe('csv_import')
      expect(candidates[1].full_name).toBe('Marcus Webb')
    })

    it('returns empty array when CSV text is blank or header-only', () => {
      expect(parseCandidatesFromCSV('')).toHaveLength(0)
      expect(parseCandidatesFromCSV('Full Name,URL')).toHaveLength(0)
    })
  })

  describe('Permitted Web Search Query Builder', () => {
    it('builds compliant Google search URLs targeting publicly indexed technical profiles', () => {
      const queries = buildWebSearchQueries(mockProfile)
      expect(queries.length).toBeGreaterThanOrEqual(3)

      const roleQuery = queries[0]
      expect(roleQuery.query).toContain('site:linkedin.com/in/')
      expect(roleQuery.query).toContain('AI/ML Engineer')
      expect(roleQuery.searchUrl).toContain('https://www.google.com/search?q=')
    })
  })
})
