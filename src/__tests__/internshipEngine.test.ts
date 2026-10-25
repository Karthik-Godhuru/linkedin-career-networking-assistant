import { describe, it, expect } from 'vitest'
import {
  calculateInternshipRelevance,
  detectWorkMode,
  buildEvaluatedInternship,
  getInternshipDuplicateHash,
} from '../services/internshipMatchingEngine'
import { parseInternshipsFromCSV } from '../services/ingestion/internshipCsvParser'
import { buildInternshipSearchQueries } from '../services/ingestion/internshipSearchQueries'
import type { CareerProfileFormData } from '../types/profile'
import type { InternshipRawInput } from '../types/internship'

const mockProfile: CareerProfileFormData = {
  target_roles: ['AI/ML Engineer', 'Python Developer'],
  target_companies: ['Google', 'OpenAI'],
  target_skills: ['Python', 'PyTorch', 'TensorFlow', 'Docker'],
  target_locations: ['Remote', 'San Francisco, CA'],
  alumni_institutions: ['Stanford University'],
  experience_level: 'entry_level',
  bio_summary: 'Aspiring AI engineer focused on scalable inference.',
}

describe('Milestone 7: Internship Matching Engine', () => {
  it('correctly scores role match, skill overlap, and company alignment', () => {
    const raw: InternshipRawInput = {
      title: 'Machine Learning Engineering Intern (Summer 2026)',
      company: 'Google',
      location: 'Mountain View, CA',
      posting_url: 'https://careers.google.com/jobs/12345?utm_source=linkedin',
      source: 'manual_entry',
      required_skills: ['Python', 'PyTorch', 'C++', 'Kubernetes'],
    }

    const evaluation = calculateInternshipRelevance(raw, mockProfile)

    // Baseline (25) + Role (30) + Skill Overlap (2 of 4 = 15) + Target Company (20) = ~90
    expect(evaluation.matchScore).toBeGreaterThanOrEqual(80)
    expect(evaluation.matchScore).toBeLessThanOrEqual(100)

    const categories = evaluation.matchReasons.map((r) => r.category)
    expect(categories).toContain('role')
    expect(categories).toContain('skill')
    expect(categories).toContain('company')

    // Detects missing skills
    expect(evaluation.missingSkills).toContain('C++')
    expect(evaluation.missingSkills).toContain('Kubernetes')
    expect(evaluation.missingSkills).not.toContain('Python')
    expect(evaluation.missingSkills).not.toContain('PyTorch')
  })

  it('rewards remote work mode when user targets remote locations', () => {
    const raw: InternshipRawInput = {
      title: 'Python Backend Developer Intern',
      company: 'Startup AI',
      location: 'Remote, US',
      work_mode: 'remote',
      posting_url: 'https://startup.ai/careers/intern',
      source: 'web_search',
      required_skills: ['Python', 'Docker'],
    }

    const evaluation = calculateInternshipRelevance(raw, mockProfile)
    const locReason = evaluation.matchReasons.find((r) => r.category === 'location')
    expect(locReason).toBeDefined()
    expect(locReason?.text.toLowerCase()).toContain('remote')
  })

  it('correctly detects work mode from location string or explicit flag', () => {
    expect(detectWorkMode('San Francisco (Remote Option)')).toBe('remote')
    expect(detectWorkMode('New York, NY (Hybrid)')).toBe('hybrid')
    expect(detectWorkMode('Seattle, WA')).toBe('onsite')
    expect(detectWorkMode('Seattle, WA', 'remote')).toBe('remote')
  })

  it('builds a fully evaluated record with deterministic fallback and tenant user_id', () => {
    const raw: InternshipRawInput = {
      title: 'AI Research Fellow',
      company: 'OpenAI',
      posting_url: 'https://openai.com/careers/fellow',
      source: 'manual_entry',
      required_skills: ['Python', 'PyTorch'],
    }

    const record = buildEvaluatedInternship(raw, 'user-12345', mockProfile)
    expect(record.user_id).toBe('user-12345')
    expect(record.title).toBe('AI Research Fellow')
    expect(record.company).toBe('OpenAI')
    expect(record.match_score).toBeGreaterThan(60)
    expect(record.missing_skills.length).toBe(0)
  })
})

describe('Milestone 7: CSV Parser for Internships', () => {
  it('parses valid CSV rows with headers and quoted fields', () => {
    const csv = `Title,Company,Location,Work Mode,URL,Deadline,Skills
"ML Intern","Anthropic","San Francisco, CA","Hybrid","https://jobs.lever.co/anthropic/123","2026-11-30","Python, PyTorch"
"Software Intern","Meta","Remote","Remote","https://metacareers.com/jobs/456","2026-12-15","Python, C++"`

    const parsed = parseInternshipsFromCSV(csv)
    expect(parsed.length).toBe(2)
    expect(parsed[0].title).toBe('ML Intern')
    expect(parsed[0].company).toBe('Anthropic')
    expect(parsed[0].work_mode).toBe('hybrid')
    expect(parsed[0].required_skills).toEqual(['Python', 'PyTorch'])
    expect(parsed[0].deadline).toBe('2026-11-30')

    expect(parsed[1].company).toBe('Meta')
    expect(parsed[1].work_mode).toBe('remote')
  })

  it('skips empty lines and rows with missing title or company', () => {
    const invalidCsv = `Title,Company,URL
"","No Title Company","https://example.com"
"Only Title","","https://example.com"
,
"Valid Intern","Valid Co","https://valid.com"`

    const parsed = parseInternshipsFromCSV(invalidCsv)
    expect(parsed.length).toBe(1)
    expect(parsed[0].title).toBe('Valid Intern')
    expect(parsed[0].company).toBe('Valid Co')
  })
})

describe('Milestone 7: URL Normalization and Duplicate Detection', () => {
  it('generates identical hash for URLs with different query params or trailing slashes', async () => {
    const url1 = 'https://careers.google.com/jobs/12345/'
    const url2 = 'https://careers.google.com/jobs/12345?utm_source=linkedin&utm_campaign=campus'
    const url3 = 'https://careers.google.com/jobs/12345'

    const hash1 = await getInternshipDuplicateHash(url1)
    const hash2 = await getInternshipDuplicateHash(url2)
    const hash3 = await getInternshipDuplicateHash(url3)

    expect(hash1).toBe(hash2)
    expect(hash2).toBe(hash3)
  })
})

describe('Milestone 7: Permitted ATS Search Queries', () => {
  it('generates zero-scraping search templates for Greenhouse, Lever, and Ashby', () => {
    const templates = buildInternshipSearchQueries(mockProfile)
    expect(templates.length).toBeGreaterThanOrEqual(3)

    const greenhouse = templates.find((t) => t.targetPlatform.includes('Greenhouse'))
    expect(greenhouse).toBeDefined()
    expect(greenhouse?.query).toContain('boards.greenhouse.io')
    expect(greenhouse?.query).toContain('AI/ML')

    const ashby = templates.find((t) => t.targetPlatform.includes('Ashby'))
    expect(ashby).toBeDefined()
    expect(ashby?.query).toContain('jobs.ashbyhq.com')
  })
})
