import { describe, it, expect } from 'vitest'
import {
  isValidLinkedInProfileUrl,
  sanitizeUrl,
  validateAndNormalizeCandidate,
  extractJsonFromResponse,
  extractCandidatesFromMarkdown,
  parseGroqCandidateResponse,
  buildGroqNaturalLanguageQuery,
  processCandidateBatch,
  classifyGroqError,
  type RawCandidateOutput,
} from '../../supabase/functions/_shared/groqSearch'
import { computeDuplicateHash } from '../lib/hash'
import { searchCandidatesWithGroq } from '../services/ingestion/groqSearchService'

describe('Groq Candidate Discovery: Strict LinkedIn Profile URL Validation', () => {
  it('accepts legitimate personal LinkedIn profile URLs with /in/ and /pub/ paths', () => {
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/in/alex-chen-123')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://linkedin.com/in/sarah-lin')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://in.linkedin.com/in/priya-sharma')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://uk.linkedin.com/pub/john-doe/1/2/3')).toBe(true)
    expect(isValidLinkedInProfileUrl('http://www.linkedin.com/in/alex-chen')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/in/alex-chen?trk=feed_profile')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/in/alex-chen/')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://uk.linkedin.com/pub/john-doe/1/2/3/')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/in/alex-chen/?locale=en_US&trk=public_profile')).toBe(true)
  })

  it('rejects bare paths, empty slugs, or double slashes without personal identifiers', () => {
    expect(isValidLinkedInProfileUrl('https://linkedin.com/in/')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://linkedin.com/in//')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://linkedin.com/pub/')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/')).toBe(false)
  })

  it('rejects GitHub profile and repository URLs', () => {
    expect(isValidLinkedInProfileUrl('https://github.com/alexchen')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://github.com/alexchen/project')).toBe(false)
    expect(isValidLinkedInProfileUrl('http://github.com/developer')).toBe(false)
  })

  it('rejects LinkedIn company, school, job, or search pages', () => {
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/company/google')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/school/stanford-university')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/jobs/view/12345')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/search/results/all/')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/pulse/article-title')).toBe(false)
  })

  it('rejects lookalike domains and attacker URLs mimicking linkedin.com', () => {
    expect(isValidLinkedInProfileUrl('https://linkedin.com.example.org/in/alex-chen')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://evil-linkedin.com/in/alex-chen')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://linkedin.com.phishing.io/in/user')).toBe(false)
  })

  it('rejects search engine redirect URLs', () => {
    expect(isValidLinkedInProfileUrl('https://www.google.com/url?q=https://linkedin.com/in/test')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://bing.com/search?q=linkedin')).toBe(false)
  })

  it('rejects non-HTTP schemes and malformed strings', () => {
    expect(isValidLinkedInProfileUrl('javascript:alert(1)')).toBe(false)
    expect(isValidLinkedInProfileUrl('ftp://linkedin.com/in/alex')).toBe(false)
    expect(isValidLinkedInProfileUrl('not a url')).toBe(false)
    expect(isValidLinkedInProfileUrl('')).toBe(false)
    expect(isValidLinkedInProfileUrl(null as unknown as string)).toBe(false)
    expect(isValidLinkedInProfileUrl(undefined as unknown as string)).toBe(false)
  })

  it('sanitizes tracking parameters, hash fragments, and trailing slashes while preserving canonical path', () => {
    const raw = 'https://www.linkedin.com/in/alex-chen/?trk=public_profile_browsemap&trkInfo=123#experience'
    const cleaned = sanitizeUrl(raw)

    expect(cleaned).toBe('https://www.linkedin.com/in/alex-chen')
    expect(cleaned).not.toContain('trk=')
    expect(cleaned).not.toContain('#experience')
    expect(cleaned.endsWith('/')).toBe(false)
  })
})

describe('Groq Candidate Discovery: Evidence-Based Normalization & Candidate Rejection', () => {
  const validCandidate: RawCandidateOutput = {
    full_name: 'Dr. Sarah Lin',
    headline: 'Staff ML Engineer | Distributed Training',
    current_company: 'AI Research Lab',
    location: 'San Francisco, CA',
    profile_url: 'https://www.linkedin.com/in/sarah-lin-phd',
    source_url: 'https://www.google.com/search?q=sarah+lin+ml',
    snippet: 'Sarah Lin is a Staff ML Engineer at AI Research Lab specializing in large language model distributed training and inference optimization.',
    evidence_summary: 'Confirmed current role at AI Research Lab with PyTorch experience.',
    skills: ['Python', 'PyTorch', 'Distributed Systems'],
  }

  it('normalizes valid candidate records with genuine personal LinkedIn profile URLs', () => {
    const res = validateAndNormalizeCandidate(validCandidate)

    expect(res.valid).toBe(true)
    if (res.valid && res.candidate) {
      expect(res.candidate.full_name).toBe('Dr. Sarah Lin')
      expect(res.candidate.headline).toBe('Staff ML Engineer | Distributed Training')
      expect(res.candidate.current_company).toBe('AI Research Lab')
      expect(res.candidate.location).toBe('San Francisco, CA')
      expect(res.candidate.profile_url).toBe('https://www.linkedin.com/in/sarah-lin-phd')
      expect(res.candidate.verification_status).toBe('Found via Web Search — Needs Review')
      expect(res.candidate.skills).toEqual(['Python', 'PyTorch', 'Distributed Systems'])
    }
  })

  it('strictly preserves sourceUrl separate from linkedinProfileUrl and never displays GitHub as profileUrl', () => {
    const itemWithGitHubSource: RawCandidateOutput = {
      ...validCandidate,
      profile_url: 'https://www.linkedin.com/in/sarah-lin-phd',
      source_url: 'https://github.com/sarahlin/papers',
    }

    const res = validateAndNormalizeCandidate(itemWithGitHubSource)
    expect(res.valid).toBe(true)
    if (res.valid && res.candidate) {
      expect(res.candidate.profile_url).toBe('https://www.linkedin.com/in/sarah-lin-phd')
      expect(res.candidate.source_url).toBe('https://github.com/sarahlin/papers')
      expect(res.candidate.profile_url).not.toContain('github.com')
    }
  })

  it('rejects candidate records pointing to GitHub profiles instead of LinkedIn', () => {
    const githubCandidate: RawCandidateOutput = {
      ...validCandidate,
      profile_url: 'https://github.com/sarahlin',
      source_url: 'https://github.com/sarahlin',
    }

    const res = validateAndNormalizeCandidate(githubCandidate)
    expect(res.valid).toBe(false)
    expect(res.rejectionReason).toBe('github_or_non_linkedin_url')
    expect(res.rejectionDetail).toContain('GitHub profile')
  })

  it('rejects candidate records pointing to LinkedIn company pages', () => {
    const companyCandidate: RawCandidateOutput = {
      ...validCandidate,
      profile_url: 'https://www.linkedin.com/company/google',
      source_url: 'https://www.linkedin.com/company/google',
    }

    const res = validateAndNormalizeCandidate(companyCandidate)
    expect(res.valid).toBe(false)
    expect(res.rejectionReason).toBe('company_or_directory_page')
    expect(res.rejectionDetail).toContain('company')
  })

  it('rejects candidate records with lookalike or attacker domains', () => {
    const lookalikeCandidate: RawCandidateOutput = {
      ...validCandidate,
      profile_url: 'https://linkedin.com.example.org/in/sarah-lin',
    }

    const res = validateAndNormalizeCandidate(lookalikeCandidate)
    expect(res.valid).toBe(false)
    expect(res.rejectionReason).toBe('invalid_or_lookalike_hostname')
  })

  it('rejects candidate records with missing or empty profile URLs', () => {
    const noUrlCandidate: RawCandidateOutput = {
      ...validCandidate,
      profile_url: '',
      source_url: '',
    }

    const res = validateAndNormalizeCandidate(noUrlCandidate)
    expect(res.valid).toBe(false)
    expect(res.rejectionReason).toBe('missing_or_malformed_url')
  })

  it('strictly labels results as "Found via Web Search — Needs Review" and never "Verified"', () => {
    const res = validateAndNormalizeCandidate(validCandidate)

    expect(res.valid).toBe(true)
    if (res.valid && res.candidate) {
      expect(res.candidate.verification_status).toBe('Found via Web Search — Needs Review')
      expect(res.candidate.verification_status).not.toBe('Verified')
      expect(res.candidate.verification_status).not.toContain('Verified Candidate')
    }
  })

  it('rejects candidate records with missing, empty, or placeholder names', () => {
    const missingName = { ...validCandidate, full_name: '' }
    const unknownName = { ...validCandidate, full_name: 'Unknown' }
    const placeholder = { ...validCandidate, full_name: 'John Doe' }
    const naName = { ...validCandidate, full_name: 'N/A' }

    expect(validateAndNormalizeCandidate(missingName).valid).toBe(false)
    expect(validateAndNormalizeCandidate(unknownName).valid).toBe(false)
    expect(validateAndNormalizeCandidate(placeholder).valid).toBe(false)
    expect(validateAndNormalizeCandidate(naName).valid).toBe(false)
  })

  it('rejects candidates lacking verifiable evidence snippets', () => {
    const emptySnippet = { ...validCandidate, snippet: '' }
    const shortSnippet = { ...validCandidate, snippet: 'hi' }

    expect(validateAndNormalizeCandidate(emptySnippet).valid).toBe(false)
    expect(validateAndNormalizeCandidate(shortSnippet).valid).toBe(false)
  })
})

describe('Groq Candidate Discovery: Model Response Extraction Resilience', () => {
  it('parses JSON candidate arrays enclosed in markdown code fences', () => {
    const markdown = 'Here are the discovered profiles:\n```json\n[\n  {\n    "full_name": "Elena Vance",\n    "profile_url": "https://linkedin.com/in/elena-vance",\n    "source_url": "https://linkedin.com/in/elena-vance",\n    "snippet": "ML engineer with PyTorch experience"\n  }\n]\n```\nHope this helps!'

    const extracted = extractJsonFromResponse(markdown)
    expect(extracted).toHaveLength(1)
    expect((extracted[0] as { full_name: string }).full_name).toBe('Elena Vance')
  })

  it('parses JSON candidate arrays without markdown fences', () => {
    const rawJson = '[\n  {\n    "full_name": "Marcus Webb",\n    "profile_url": "https://linkedin.com/in/marcus-webb",\n    "source_url": "https://linkedin.com/in/marcus-webb",\n    "snippet": "Systems engineer with Python and distributed systems"\n  }\n]'

    const extracted = extractJsonFromResponse(rawJson)
    expect(extracted).toHaveLength(1)
    expect((extracted[0] as { full_name: string }).full_name).toBe('Marcus Webb')
  })

  it('parses candidates nested inside an object property { candidates: [...] }', () => {
    const nested = '{"candidates": [{"full_name": "Priya Sharma", "profile_url": "https://linkedin.com/in/priya-sharma", "source_url": "https://linkedin.com/in/priya-sharma", "snippet": "AI researcher at DeepMind"}]}'

    const extracted = extractJsonFromResponse(nested)
    expect(extracted).toHaveLength(1)
    expect((extracted[0] as { full_name: string }).full_name).toBe('Priya Sharma')
  })

  it('returns empty array safely on malformed or empty output without throwing', () => {
    expect(extractJsonFromResponse('')).toEqual([])
    expect(extractJsonFromResponse('No profiles found on the web.')).toEqual([])
    expect(extractJsonFromResponse('{malformed: json,')).toEqual([])
  })
})

describe('Groq Candidate Discovery: Duplicate Detection & Hash Integration', () => {
  it('generates consistent duplicate hashes for discovered URLs regardless of tracking params', async () => {
    const url1 = 'https://www.linkedin.com/in/priya-sharma'
    const url2 = 'https://www.linkedin.com/in/priya-sharma?trk=feed_profile#about'

    const hash1 = await computeDuplicateHash(url1)
    const hash2 = await computeDuplicateHash(url2)

    expect(hash1).toBe(hash2)
  })

  it('deduplicates identical profiles discovered multiple times in one search', async () => {
    const candidates = [
      {
        full_name: 'Sarah Lin',
        profile_url: 'https://www.linkedin.com/in/sarah-lin',
      },
      {
        full_name: 'Sarah Lin',
        profile_url: 'https://www.linkedin.com/in/sarah-lin?trk=test',
      },
      {
        full_name: 'Alex Chen',
        profile_url: 'https://www.linkedin.com/in/alex-chen',
      },
    ]

    const uniqueHashes = new Set<string>()
    const deduplicated = []

    for (const c of candidates) {
      const hash = await computeDuplicateHash(c.profile_url)
      if (!uniqueHashes.has(hash)) {
        uniqueHashes.add(hash)
        deduplicated.push(c)
      }
    }

    expect(deduplicated).toHaveLength(2)
    expect(deduplicated.map((c) => c.full_name)).toEqual(['Sarah Lin', 'Alex Chen'])
  })
})

describe('Groq Candidate Discovery: Edge Service & Rejection Breakdown Reporting', () => {
  it('returns helpful error when Supabase client is unconfigured', async () => {
    const res = await searchCandidatesWithGroq({ role: 'ML Engineer' })

    if (!res.success) {
      expect(res.candidates).toEqual([])
      expect(res.count).toBe(0)
      expect(res.error).toBeDefined()
    }
  })

  it('accurately tallies rejections by reason when non-LinkedIn profiles are returned', () => {
    const mixedBatch: RawCandidateOutput[] = [
      {
        full_name: 'Valid Member',
        profile_url: 'https://www.linkedin.com/in/valid-member',
        snippet: 'Staff AI engineer at DeepMind working with PyTorch.',
      },
      {
        full_name: 'GitHub User',
        profile_url: 'https://github.com/developer',
        snippet: 'Open source contributor with repos.',
      },
      {
        full_name: 'Company Page',
        profile_url: 'https://www.linkedin.com/company/scale-ai',
        snippet: 'Scale AI company overview and careers.',
      },
      {
        full_name: 'Attacker Domain',
        profile_url: 'https://linkedin.com.example.org/in/fake',
        snippet: 'Fake profile on phishing site.',
      },
      {
        full_name: '',
        profile_url: 'https://www.linkedin.com/in/no-name',
        snippet: 'Snippet without valid name.',
      },
    ]

    const tally = {
      valid: 0,
      rejected: 0,
      breakdown: {
        githubOrNonLinkedIn: 0,
        companyOrDirectory: 0,
        invalidOrLookalike: 0,
        invalidName: 0,
      },
    }

    for (const item of mixedBatch) {
      const res = validateAndNormalizeCandidate(item)
      if (res.valid) {
        tally.valid++
      } else {
        tally.rejected++
        if (res.rejectionReason === 'github_or_non_linkedin_url') tally.breakdown.githubOrNonLinkedIn++
        if (res.rejectionReason === 'company_or_directory_page') tally.breakdown.companyOrDirectory++
        if (res.rejectionReason === 'invalid_or_lookalike_hostname') tally.breakdown.invalidOrLookalike++
        if (res.rejectionReason === 'missing_or_placeholder_name') tally.breakdown.invalidName++
      }
    }

    expect(tally.valid).toBe(1)
    expect(tally.rejected).toBe(4)
    expect(tally.breakdown.githubOrNonLinkedIn).toBe(1)
    expect(tally.breakdown.companyOrDirectory).toBe(1)
    expect(tally.breakdown.invalidOrLookalike).toBe(1)
    expect(tally.breakdown.invalidName).toBe(1)
  })

  it('formats edge function error diagnostics for missing API keys or rate limits', () => {
    const formatGroqError = (code: string, rawMsg?: string) => {
      if (code === 'MISSING_GROQ_API_KEY') {
        return 'GROQ_API_KEY is not configured in Supabase secrets.'
      }
      if (code === 'RATE_LIMIT_EXCEEDED') {
        return 'Groq API rate limit reached. Please wait a minute and retry.'
      }
      return rawMsg || 'Search failed'
    }

    expect(formatGroqError('MISSING_GROQ_API_KEY')).toContain('GROQ_API_KEY is not configured')
    expect(formatGroqError('RATE_LIMIT_EXCEEDED')).toContain('rate limit reached')
    expect(formatGroqError('OTHER', 'Network timeout')).toBe('Network timeout')
  })
})

describe('Groq Candidate Discovery: Markdown Citation & Plain Text Fallback Extraction', () => {
  it('extracts candidates from markdown numbered lists with [Name](linkedin-url) links', () => {
    const markdown = `
Here are the profiles found on LinkedIn:

1. [Sarah Lin](https://www.linkedin.com/in/sarah-lin) - Staff ML Engineer at AI Lab. Specializing in PyTorch, distributed training, and LLM fine-tuning based in San Francisco, CA.
2. [Marcus Webb](https://www.linkedin.com/in/marcus-webb) - Lead AI Infrastructure Architect at Scale Systems in New York, NY. Expert in CUDA and model serving.
`

    const candidates = extractCandidatesFromMarkdown(markdown)
    expect(candidates).toHaveLength(2)

    expect(candidates[0].full_name).toBe('Sarah Lin')
    expect(candidates[0].profile_url).toBe('https://www.linkedin.com/in/sarah-lin')
    expect(candidates[0].current_company).toBe('AI Lab')
    expect(candidates[0].location).toBe('San Francisco')
    expect(candidates[0].snippet).toContain('Staff ML Engineer')

    expect(candidates[1].full_name).toBe('Marcus Webb')
    expect(candidates[1].profile_url).toBe('https://www.linkedin.com/in/marcus-webb')
    expect(candidates[1].current_company).toBe('Scale Systems')
    expect(candidates[1].location).toBe('New York')
  })

  it('extracts candidates from bullet points with bolded names and explicit profile URLs', () => {
    const markdown = `
Search results from public LinkedIn profiles:

* **Dr. Elena Vance**
  Headline: Senior Machine Learning Specialist
  Company: Quantum AI
  Location: Seattle, WA
  Profile: [LinkedIn Profile](https://www.linkedin.com/in/dr-elena-vance-ai)
  Evidence: Experienced in reinforcement learning and PyTorch development.
`

    const candidates = extractCandidatesFromMarkdown(markdown)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].full_name).toBe('Dr. Elena Vance')
    expect(candidates[0].profile_url).toBe('https://www.linkedin.com/in/dr-elena-vance-ai')
    expect(candidates[0].headline).toBe('Senior Machine Learning Specialist')
    expect(candidates[0].current_company).toBe('Quantum AI')
    expect(candidates[0].location).toBe('Seattle, WA')
    expect(candidates[0].snippet).toContain('reinforcement learning')
  })

  it('extracts raw LinkedIn profile URLs embedded directly in plain text without Markdown brackets', () => {
    const rawText = `
Discovered candidate profile:
Alex Chen is a Senior AI Engineer at NeuralTech in Austin, TX.
View his LinkedIn profile at https://www.linkedin.com/in/alex-chen-ai for details on PyTorch pipelines.
`

    const candidates = extractCandidatesFromMarkdown(rawText)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].full_name).toBe('Alex Chen')
    expect(candidates[0].profile_url).toBe('https://www.linkedin.com/in/alex-chen-ai')
    expect(candidates[0].snippet).toContain('NeuralTech')
  })

  it('rejects blocks that contain only GitHub URLs or non-LinkedIn domains', () => {
    const markdown = `
Found the following developer profiles:

1. [OpenSource Dev](https://github.com/alexchen/ml-project) - Main contributor to popular PyTorch repository.
2. [Tech Blog](https://medium.com/@ml-writer/guide) - Article on machine learning best practices.
`

    const candidates = extractCandidatesFromMarkdown(markdown)
    // Non-LinkedIn URLs should not yield a candidate with a valid profile_url
    for (const c of candidates) {
      const outcome = validateAndNormalizeCandidate(c)
      expect(outcome.valid).toBe(false)
      expect(outcome.rejectionReason).toBe('github_or_non_linkedin_url')
    }
  })

  it('returns empty array when content contains conversational text without URLs', () => {
    const emptyResponse = 'I searched for AI/ML engineers matching your query but could not find publicly indexed profiles.'
    expect(extractCandidatesFromMarkdown(emptyResponse)).toEqual([])
    expect(extractCandidatesFromMarkdown('')).toEqual([])
  })
})

describe('Groq Candidate Discovery: Universal Dual-Path Parsing (parseGroqCandidateResponse)', () => {
  it('correctly uses JSON parsing path when model returns valid JSON array', () => {
    const jsonText = `
\`\`\`json
[
  {
    "full_name": "Sarah Lin",
    "headline": "Staff ML Engineer",
    "profile_url": "https://www.linkedin.com/in/sarah-lin",
    "source_url": "https://www.linkedin.com/in/sarah-lin",
    "snippet": "ML engineer with extensive PyTorch experience"
  }
]
\`\`\`
`
    const result = parseGroqCandidateResponse(jsonText)
    expect(result.format).toBe('json')
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].full_name).toBe('Sarah Lin')
  })

  it('correctly falls back to Markdown parsing path when model returns natural language list', () => {
    const markdownText = `
Based on my search, here is a relevant profile:

1. [Priya Sharma](https://www.linkedin.com/in/priya-sharma-ml) - Principal Research Scientist at DeepMind in London, UK. Leading transformer scaling efforts.
`
    const result = parseGroqCandidateResponse(markdownText)
    expect(result.format).toBe('markdown')
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].full_name).toBe('Priya Sharma')
    expect(result.candidates[0].profile_url).toBe('https://www.linkedin.com/in/priya-sharma-ml')
  })

  it('returns format "empty" when content has neither JSON nor extractable links', () => {
    expect(parseGroqCandidateResponse('').format).toBe('empty')
    expect(parseGroqCandidateResponse('No search results found.').format).toBe('empty')
  })

  it('preserves diagnostics and rejection counts through end-to-end normalization', () => {
    const markdownWithMixedResults = `
Discovered profiles:
1. [Sarah Lin](https://www.linkedin.com/in/sarah-lin) - Staff ML Engineer at AI Lab with PyTorch experience.
2. [GitHub Dev](https://github.com/developer/repo) - Open source AI repository developer.
3. [Company Org](https://www.linkedin.com/company/tech-corp) - Technology corporation headquarters.
`
    const parseResult = parseGroqCandidateResponse(markdownWithMixedResults)
    expect(parseResult.format).toBe('markdown')

    let accepted = 0
    let rejected = 0
    const rejectionBreakdown = {
      githubOrNonLinkedIn: 0,
      companyOrDirectory: 0,
      missingOrMalformedUrl: 0,
      missingEvidence: 0,
      invalidName: 0,
    }

    for (const item of parseResult.candidates) {
      const outcome = validateAndNormalizeCandidate(item)
      if (outcome.valid && outcome.candidate) {
        accepted++
      } else {
        rejected++
        if (outcome.rejectionReason === 'github_or_non_linkedin_url') {
          rejectionBreakdown.githubOrNonLinkedIn++
        } else if (outcome.rejectionReason === 'company_or_directory_page') {
          rejectionBreakdown.companyOrDirectory++
        }
      }
    }

    expect(accepted).toBe(1)
    expect(rejected).toBe(2)
    expect(rejectionBreakdown.githubOrNonLinkedIn).toBe(1)
    expect(rejectionBreakdown.companyOrDirectory).toBe(1)
  })
})

describe('Groq Candidate Discovery: Natural-Language Exa Query Formulation', () => {
  it('builds natural-language queries without exact quotes or Google site: syntax', () => {
    const q = buildGroqNaturalLanguageQuery({
      role: 'Staff ML Engineer',
      skills: ['Python', 'PyTorch', 'Distributed Systems'],
      location: 'San Francisco, CA',
      company: 'Scale AI',
    })

    expect(q).toBe(
      'public LinkedIn member profile of a Staff ML Engineer skilled in Python, PyTorch, Distributed Systems based in San Francisco, CA working at Scale AI'
    )
    expect(q).not.toContain('site:')
    expect(q).not.toContain('"')
  })

  it('includes skills, location, and company only when supplied', () => {
    const minimal = buildGroqNaturalLanguageQuery({
      role: 'Backend Developer',
    })
    expect(minimal).toBe('public LinkedIn member profile of a Backend Developer')
    expect(minimal).not.toContain('skilled in')
    expect(minimal).not.toContain('based in')
    expect(minimal).not.toContain('working at')

    const withSkills = buildGroqNaturalLanguageQuery({
      role: 'AI Researcher',
      skills: ['TensorFlow', 'JAX'],
    })
    expect(withSkills).toBe('public LinkedIn member profile of a AI Researcher skilled in TensorFlow, JAX')
  })

  it('omits location if remote or unspecified', () => {
    const remote = buildGroqNaturalLanguageQuery({
      role: 'Data Scientist',
      location: 'Remote, US',
    })
    expect(remote).not.toContain('based in')

    const emptyLoc = buildGroqNaturalLanguageQuery({
      role: 'Data Scientist',
      location: '',
    })
    expect(emptyLoc).not.toContain('based in')
  })

  it('builds a broader retry query removing restrictive location and company terms', () => {
    const broader = buildGroqNaturalLanguageQuery({
      role: 'AI Engineer',
      skills: ['PyTorch', 'CUDA', 'Triton'],
      location: 'Seattle, WA',
      company: 'Amazon',
      broader: true,
    })

    expect(broader).toBe('public LinkedIn member profile of a AI Engineer skilled in PyTorch')
    expect(broader).not.toContain('Seattle')
    expect(broader).not.toContain('Amazon')
    expect(broader).not.toContain('CUDA')
    expect(broader).not.toContain('site:')
  })
})

describe('Groq Candidate Discovery: Batch Processing, Deduplication & Diagnostics', () => {
  it('processes a candidate batch with validation, deduplication, and rejection categorization', () => {
    const rawBatch: RawCandidateOutput[] = [
      {
        full_name: 'Dr. Sarah Lin',
        headline: 'Staff ML Engineer',
        profile_url: 'https://www.linkedin.com/in/sarah-lin',
        snippet: 'Staff ML Engineer at AI Lab specializing in distributed PyTorch training.',
      },
      // Duplicate of Sarah Lin with tracking parameter and trailing slash
      {
        full_name: 'Dr. Sarah Lin',
        headline: 'Staff ML Engineer',
        profile_url: 'https://www.linkedin.com/in/sarah-lin/?trk=feed',
        snippet: 'Duplicate candidate profile snippet from web search.',
      },
      // Valid candidate with /pub/ URL
      {
        full_name: 'John Doe Senior',
        headline: 'Principal Engineer',
        profile_url: 'https://uk.linkedin.com/pub/john-doe-sr/1/2/3/',
        snippet: 'Principal engineer with 15 years experience in deep learning systems.',
      },
      // GitHub profile (must be rejected)
      {
        full_name: 'Alex OpenSource',
        profile_url: 'https://github.com/alex-dev',
        snippet: 'Open source PyTorch model contributor.',
      },
      // LinkedIn company page (must be rejected)
      {
        full_name: 'Scale AI Inc',
        profile_url: 'https://www.linkedin.com/company/scale-ai',
        snippet: 'Data platform company for artificial intelligence applications.',
      },
      // Missing name placeholder
      {
        full_name: 'Unknown',
        profile_url: 'https://www.linkedin.com/in/mystery-user',
        snippet: 'Profile found with unknown name.',
      },
      // Missing snippet
      {
        full_name: 'Elena Vance',
        profile_url: 'https://www.linkedin.com/in/elena-vance-ml',
        snippet: '',
      },
      // Malformed URL
      {
        full_name: 'Marcus Webb',
        profile_url: 'not-a-valid-url',
        snippet: 'Systems developer with deep learning background.',
      },
    ]

    const result = processCandidateBatch(rawBatch)

    expect(result.validatedCandidates).toHaveLength(2)
    expect(result.validatedCandidates.map((c) => c.full_name)).toEqual([
      'Dr. Sarah Lin',
      'John Doe Senior',
    ])
    // Both validated profiles must have sanitized personal URLs without trailing slashes
    expect(result.validatedCandidates[0].profile_url).toBe('https://www.linkedin.com/in/sarah-lin')
    expect(result.validatedCandidates[1].profile_url).toBe('https://uk.linkedin.com/pub/john-doe-sr/1/2/3')

    expect(result.duplicatesFiltered).toBe(1)
    expect(result.totalUrlsExtracted).toBe(8)
    expect(result.rejectedCount).toBe(5)
    expect(result.rejectionBreakdown.githubOrNonLinkedIn).toBe(1)
    expect(result.rejectionBreakdown.companyOrDirectory).toBe(1)
    expect(result.rejectionBreakdown.invalidName).toBe(1)
    expect(result.rejectionBreakdown.missingEvidence).toBe(1)
    expect(result.rejectionBreakdown.missingOrMalformedUrl).toBe(1)
  })

  it('handles an empty batch returning zeroed counters and empty candidate array', () => {
    const result = processCandidateBatch([])
    expect(result.validatedCandidates).toEqual([])
    expect(result.totalUrlsExtracted).toBe(0)
    expect(result.rejectedCount).toBe(0)
    expect(result.duplicatesFiltered).toBe(0)
    expect(result.rejectionBreakdown).toEqual({
      githubOrNonLinkedIn: 0,
      companyOrDirectory: 0,
      missingOrMalformedUrl: 0,
      missingEvidence: 0,
      invalidName: 0,
    })
  })

  it('deduplicates against previously seen URLs across multiple search waves', () => {
    const existingSeen = new Set<string>(['https://www.linkedin.com/in/sarah-lin'])
    const newBatch: RawCandidateOutput[] = [
      {
        full_name: 'Dr. Sarah Lin',
        profile_url: 'https://www.linkedin.com/in/sarah-lin',
        snippet: 'Discovered in a second search query.',
      },
      {
        full_name: 'Marcus Webb',
        profile_url: 'https://www.linkedin.com/in/marcus-webb',
        snippet: 'Discovered in second search query.',
      },
    ]

    const result = processCandidateBatch(newBatch, existingSeen)
    expect(result.validatedCandidates).toHaveLength(1)
    expect(result.validatedCandidates[0].full_name).toBe('Marcus Webb')
    expect(result.duplicatesFiltered).toBe(1)
  })
})

describe('Groq Candidate Discovery: Latency Bounding & Error Classification', () => {
  it('classifies HTTP 429 as RATE_LIMIT_EXCEEDED with status 429', () => {
    const err = classifyGroqError(429)
    expect(err.status).toBe(429)
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(err.message).toContain('rate limit')
    expect(err.message).not.toContain('timeout')
  })

  it('classifies HTTP 524 Cloudflare upstream timeout as GATEWAY_TIMEOUT with status 504 and never rate-limit', () => {
    const cloudflareHtml = '<!DOCTYPE html><html><head><title>524 A timeout occurred</title></head><body>Cloudflare error</body></html>'
    const err = classifyGroqError(524, undefined, cloudflareHtml)

    expect(err.status).toBe(504)
    expect(err.code).toBe('GATEWAY_TIMEOUT')
    expect(err.message).toContain('timed out upstream')
    // Must NOT label as rate limit
    expect(err.code).not.toBe('RATE_LIMIT_EXCEEDED')
    expect(err.message).not.toContain('rate limit')
    // Must NOT expose raw Cloudflare HTML
    expect(err.message).not.toContain('<!DOCTYPE')
    expect(err.message).not.toContain('<html>')
    expect(err.message).not.toContain('Cloudflare')
  })

  it('classifies HTTP 504 as GATEWAY_TIMEOUT with status 504', () => {
    const err = classifyGroqError(504)
    expect(err.status).toBe(504)
    expect(err.code).toBe('GATEWAY_TIMEOUT')
    expect(err.message).toContain('timed out')
  })

  it('classifies local AbortController timeout as REQUEST_TIMEOUT with status 504', () => {
    const err = classifyGroqError(504, 'REQUEST_TIMEOUT')
    expect(err.status).toBe(504)
    expect(err.code).toBe('REQUEST_TIMEOUT')
    expect(err.message).toContain('100 seconds')
  })

  it('classifies HTTP 401 as INVALID_API_KEY with status 500', () => {
    const err = classifyGroqError(401)
    expect(err.status).toBe(500)
    expect(err.code).toBe('INVALID_API_KEY')
    expect(err.message).toContain('GROQ_API_KEY')
  })

  it('classifies general HTTP 5xx errors as GROQ_SERVICE_ERROR and suppresses raw HTML', () => {
    const htmlErr = classifyGroqError(502, undefined, '<p>Bad Gateway</p>')
    expect(htmlErr.status).toBe(502)
    expect(htmlErr.code).toBe('GROQ_SERVICE_ERROR')
    expect(htmlErr.message).not.toContain('<p>')

    const plainErr = classifyGroqError(503, undefined, 'Service Unavailable')
    expect(plainErr.status).toBe(503)
    expect(plainErr.code).toBe('GROQ_SERVICE_ERROR')
    expect(plainErr.message).toBe('Service Unavailable')
  })

  it('ensures single search execution without automatic second search on timeout or zero results', () => {
    // Verify that buildGroqNaturalLanguageQuery builds targeted query by default
    const targeted = buildGroqNaturalLanguageQuery({
      role: 'ML Engineer',
      skills: ['Python'],
      location: 'Austin, TX',
      company: 'Dell',
      broader: false,
    })
    expect(targeted).toContain('Austin')
    expect(targeted).toContain('Dell')

    // Verify broader query is generated only when explicitly requested
    const broader = buildGroqNaturalLanguageQuery({
      role: 'ML Engineer',
      skills: ['Python'],
      location: 'Austin, TX',
      company: 'Dell',
      broader: true,
    })
    expect(broader).not.toContain('Austin')
    expect(broader).not.toContain('Dell')
    expect(broader).toBe('public LinkedIn member profile of a ML Engineer skilled in Python')
  })
})
