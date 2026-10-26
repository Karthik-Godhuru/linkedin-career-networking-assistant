import { describe, it, expect } from 'vitest'
import {
  isValidLinkedInProfileUrl,
  isValidHttpUrl,
  sanitizeUrl,
  validateAndNormalizeCandidate,
  extractCitationsAndText,
  extractJsonFromText,
  extractMarkdownCandidates,
  parseGeminiResponse,
  buildGeminiSearchPrompt,
  processCandidateBatch,
  classifyGeminiError,
  type RawCandidateOutput,
} from '../../supabase/functions/_shared/geminiSearch'
import { searchCandidatesWithGemini } from '../services/ingestion/geminiSearchService'

describe('Gemini Candidate Discovery: Strict LinkedIn Profile URL Validation', () => {
  it('accepts legitimate personal LinkedIn profile URLs with /in/ and /pub/ paths', () => {
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/in/alex-chen-123')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://linkedin.com/in/sarah-lin')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://in.linkedin.com/in/priya-sharma')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://uk.linkedin.com/pub/john-doe/1/2/3')).toBe(true)
    expect(isValidLinkedInProfileUrl('http://www.linkedin.com/in/alex-chen')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/in/alex-chen?trk=feed_profile')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://www.linkedin.com/in/alex-chen/')).toBe(true)
    expect(isValidLinkedInProfileUrl('https://uk.linkedin.com/pub/john-doe/1/2/3/')).toBe(true)
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

  it('rejects lookalike domains mimicking linkedin.com', () => {
    expect(isValidLinkedInProfileUrl('https://linkedin.com.example.org/in/alex-chen')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://evil-linkedin.com/in/alex-chen')).toBe(false)
    expect(isValidLinkedInProfileUrl('https://linkedin.com.phishing.io/in/user')).toBe(false)
  })

  it('sanitizes tracking parameters, hash fragments, and trailing slashes while preserving canonical path', () => {
    const raw = 'https://www.linkedin.com/in/alex-chen/?trk=public_profile_browsemap&trkInfo=123#experience'
    const cleaned = sanitizeUrl(raw)
    expect(cleaned).toBe('https://www.linkedin.com/in/alex-chen')
    expect(cleaned).not.toContain('trk=')
    expect(cleaned).not.toContain('#experience')
    expect(cleaned.endsWith('/')).toBe(false)
  })

  it('validates HTTP and HTTPS URLs correctly', () => {
    expect(isValidHttpUrl('https://www.linkedin.com/in/alex')).toBe(true)
    expect(isValidHttpUrl('http://example.com')).toBe(true)
    expect(isValidHttpUrl('ftp://example.com')).toBe(false)
    expect(isValidHttpUrl('invalid-url')).toBe(false)
  })
})

describe('Gemini Candidate Discovery: Low-level Citation and Content Parsing', () => {
  it('extracts citations and text from Interactions API annotations', () => {
    const payload = {
      steps: [
        {
          type: 'model_output',
          content: [
            {
              type: 'text',
              text: 'Found engineer Alex Chen.',
              annotations: [
                {
                  type: 'url_citation',
                  url: 'https://www.linkedin.com/in/alex-chen',
                  title: 'Alex Chen',
                  start_index: 0,
                  end_index: 25,
                },
              ],
            },
          ],
        },
      ],
    }

    const { fullText, citations } = extractCitationsAndText(payload)
    expect(fullText).toContain('Found engineer Alex Chen.')
    expect(citations).toHaveLength(1)
    expect(citations[0].url).toBe('https://www.linkedin.com/in/alex-chen')
    expect(citations[0].startIndex).toBe(0)
  })

  it('extracts JSON objects from codeblocks or raw text', () => {
    const jsonText = '```json\n[{"full_name": "Alex", "profile_url": "https://linkedin.com/in/alex"}]\n```'
    const parsed = extractJsonFromText(jsonText)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].full_name).toBe('Alex')
  })

  it('extracts candidates from Markdown bullet lists', () => {
    const mdText = '- **Elena Vance** - Senior ML Engineer at vLLM Labs. [Profile](https://www.linkedin.com/in/elena-vance). Snippet: Distributed training specialist.'
    const candidates = extractMarkdownCandidates(mdText, [])
    expect(candidates).toHaveLength(1)
    expect(candidates[0].full_name).toBe('Elena Vance')
    expect(candidates[0].profile_url).toBe('https://www.linkedin.com/in/elena-vance')
  })
})

describe('Gemini Candidate Discovery: Citation Grounding & Evidence Allow-List', () => {
  const allowList = new Set<string>([
    'https://www.linkedin.com/in/alex-chen',
    'https://www.linkedin.com/in/priya-patel',
  ])

  it('accepts candidate whose profile URL is present in citation allow-list', () => {
    const raw: RawCandidateOutput = {
      full_name: 'Alex Chen',
      headline: 'Senior ML Engineer',
      profile_url: 'https://www.linkedin.com/in/alex-chen',
      snippet: 'Alex is a Senior Machine Learning Engineer specializing in distributed training with PyTorch.',
    }

    const outcome = validateAndNormalizeCandidate(raw, allowList)
    expect(outcome.valid).toBe(true)
    expect(outcome.candidate?.full_name).toBe('Alex Chen')
    expect(outcome.candidate?.profile_url).toBe('https://www.linkedin.com/in/alex-chen')
  })

  it('accepts candidate when profile URL in text contains tracking params but matches citation allow-list after sanitization', () => {
    const raw: RawCandidateOutput = {
      full_name: 'Priya Patel',
      headline: 'AI Research Scientist',
      profile_url: 'https://www.linkedin.com/in/priya-patel?trk=public_profile',
      snippet: 'Priya conducts AI research on multimodal foundational models.',
    }

    const outcome = validateAndNormalizeCandidate(raw, allowList)
    expect(outcome.valid).toBe(true)
    expect(outcome.candidate?.full_name).toBe('Priya Patel')
    expect(outcome.candidate?.profile_url).toBe('https://www.linkedin.com/in/priya-patel')
  })

  it('rejects candidate whose profile URL was hallucinated and not present in citation allow-list', () => {
    const raw: RawCandidateOutput = {
      full_name: 'Hallucinated Person',
      headline: 'AI Researcher',
      profile_url: 'https://www.linkedin.com/in/invented-profile',
      snippet: 'An ungrounded candidate invented by LLM.',
    }

    const outcome = validateAndNormalizeCandidate(raw, allowList)
    expect(outcome.valid).toBe(false)
    expect(outcome.rejectionReason).toBe('not_in_citation_allowlist')
  })

  it('rejects candidate with missing or placeholder name', () => {
    const raw: RawCandidateOutput = {
      full_name: 'Unknown',
      profile_url: 'https://www.linkedin.com/in/alex-chen',
      snippet: 'Some valid snippet text here.',
    }
    const outcome = validateAndNormalizeCandidate(raw, allowList)
    expect(outcome.valid).toBe(false)
    expect(outcome.rejectionReason).toBe('missing_or_placeholder_name')
  })

  it('rejects candidate with missing or short snippet evidence', () => {
    const raw: RawCandidateOutput = {
      full_name: 'Alex Chen',
      profile_url: 'https://www.linkedin.com/in/alex-chen',
      snippet: 'Short',
    }
    const outcome = validateAndNormalizeCandidate(raw, allowList)
    expect(outcome.valid).toBe(false)
    expect(outcome.rejectionReason).toBe('missing_evidence_snippet')
  })

  it('rejects GitHub URL even if citation attempted', () => {
    const raw: RawCandidateOutput = {
      full_name: 'Coder Alex',
      profile_url: 'https://github.com/alexchen',
      snippet: 'Alex is a developer on GitHub working on PyTorch.',
    }
    const outcome = validateAndNormalizeCandidate(raw, new Set(['https://github.com/alexchen']))
    expect(outcome.valid).toBe(false)
    expect(outcome.rejectionReason).toBe('github_or_non_linkedin_url')
  })

  it('rejects LinkedIn company page even if citation attempted', () => {
    const raw: RawCandidateOutput = {
      full_name: 'Google Company',
      profile_url: 'https://www.linkedin.com/company/google',
      snippet: 'Company page for Google.',
    }
    const outcome = validateAndNormalizeCandidate(raw, new Set(['https://www.linkedin.com/company/google']))
    expect(outcome.valid).toBe(false)
    expect(outcome.rejectionReason).toBe('company_or_directory_page')
  })
})

describe('Gemini Candidate Discovery: Interactions API Response Parsing', () => {
  it('parses Gemini Interactions API response with steps and url_citation annotations', () => {
    const interactionsResponse = {
      id: 'int_123',
      object: 'interaction',
      model: 'gemini-3.8-flash',
      status: 'completed',
      steps: [
        {
          type: 'model_output',
          content: [
            {
              type: 'text',
              text: '```json\n[\n  {\n    "full_name": "Marcus Vance",\n    "headline": "Lead Systems Engineer",\n    "current_company": "Scale AI",\n    "location": "San Francisco, CA",\n    "profile_url": "https://www.linkedin.com/in/marcus-vance-ai",\n    "snippet": "Marcus Vance leads systems infrastructure for AI training workloads at Scale AI.",\n    "skills": ["C++", "PyTorch", "CUDA"]\n  }\n]\n```',
              annotations: [
                {
                  type: 'url_citation',
                  url: 'https://www.linkedin.com/in/marcus-vance-ai',
                  title: 'Marcus Vance - Lead Systems Engineer - Scale AI | LinkedIn',
                  start_index: 0,
                  end_index: 250,
                },
              ],
            },
          ],
        },
      ],
    }

    const parseResult = parseGeminiResponse(interactionsResponse)
    expect(parseResult.format).toBe('json')
    expect(parseResult.candidates).toHaveLength(1)
    expect(parseResult.citations).toHaveLength(1)
    expect(parseResult.citations[0].url).toBe('https://www.linkedin.com/in/marcus-vance-ai')

    const allowList = new Set(parseResult.citations.map((c) => sanitizeUrl(c.url)))
    const batch = processCandidateBatch(parseResult.candidates, allowList)
    expect(batch.validatedCandidates).toHaveLength(1)
    expect(batch.validatedCandidates[0].full_name).toBe('Marcus Vance')
    expect(batch.validatedCandidates[0].profile_url).toBe('https://www.linkedin.com/in/marcus-vance-ai')
  })

  it('parses fallback Markdown response when JSON block is not emitted', () => {
    const mdResponse = {
      steps: [
        {
          type: 'model_output',
          content: [
            {
              type: 'text',
              text: '1. **David Miller** - Technical Recruiter at Scale AI\nLocation: Remote\n[LinkedIn Profile](https://www.linkedin.com/in/david-miller-recruiter)\nSnippet: Technical talent acquisition partner recruiting machine learning engineers.',
              annotations: [
                {
                  type: 'url_citation',
                  url: 'https://www.linkedin.com/in/david-miller-recruiter',
                  title: 'David Miller | LinkedIn',
                },
              ],
            },
          ],
        },
      ],
    }

    const parseResult = parseGeminiResponse(mdResponse)
    expect(parseResult.format).toBe('markdown')
    expect(parseResult.candidates).toHaveLength(1)
    expect(parseResult.candidates[0].full_name).toBe('David Miller')

    const allowList = new Set(parseResult.citations.map((c) => sanitizeUrl(c.url)))
    const batch = processCandidateBatch(parseResult.candidates, allowList)
    expect(batch.validatedCandidates).toHaveLength(1)
    expect(batch.validatedCandidates[0].full_name).toBe('David Miller')
  })

  it('handles empty response gracefully with zero candidates and empty format', () => {
    const emptyResponse = {
      steps: [
        {
          type: 'model_output',
          content: [
            {
              type: 'text',
              text: '[]',
              annotations: [],
            },
          ],
        },
      ],
    }

    const parseResult = parseGeminiResponse(emptyResponse)
    expect(parseResult.candidates).toHaveLength(0)
    const batch = processCandidateBatch(parseResult.candidates, new Set())
    expect(batch.validatedCandidates).toHaveLength(0)
    expect(batch.rejectedCount).toBe(0)
  })

  it('filters duplicate candidates sharing the same canonical LinkedIn profile URL', () => {
    const duplicateList: RawCandidateOutput[] = [
      {
        full_name: 'Sarah Lin',
        headline: 'Staff ML Engineer',
        profile_url: 'https://www.linkedin.com/in/sarah-lin',
        snippet: 'Staff Machine Learning Engineer at Anthropic.',
      },
      {
        full_name: 'Sarah Lin',
        headline: 'Staff ML Engineer',
        profile_url: 'https://www.linkedin.com/in/sarah-lin?trk=copy',
        snippet: 'Duplicate record from search results.',
      },
    ]

    const allowList = new Set(['https://www.linkedin.com/in/sarah-lin'])
    const batch = processCandidateBatch(duplicateList, allowList)
    expect(batch.validatedCandidates).toHaveLength(1)
    expect(batch.duplicatesFiltered).toBe(1)
  })
})

describe('Gemini Candidate Discovery: Error Classification & Latency Bounding', () => {
  it('classifies HTTP 429 as RATE_LIMIT_EXCEEDED with status 429', () => {
    const err = classifyGeminiError(429)
    expect(err.status).toBe(429)
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(err.message).toContain('rate limit')
  })

  it('classifies HTTP 401 and 403 as AUTH_OR_PERMISSION_ERROR with status 403', () => {
    const err401 = classifyGeminiError(401)
    expect(err401.status).toBe(403)
    expect(err401.code).toBe('AUTH_OR_PERMISSION_ERROR')

    const err403 = classifyGeminiError(403)
    expect(err403.status).toBe(403)
    expect(err403.code).toBe('AUTH_OR_PERMISSION_ERROR')
  })

  it('classifies HTTP 404 as MODEL_NOT_FOUND with status 404', () => {
    const err = classifyGeminiError(404)
    expect(err.status).toBe(404)
    expect(err.code).toBe('MODEL_NOT_FOUND')
    expect(err.message).toContain('model was not found')
  })

  it('classifies HTTP 524 Cloudflare upstream timeout as GATEWAY_TIMEOUT with status 504 and never rate-limit', () => {
    const htmlMsg = '<!DOCTYPE html><html><title>524 Timeout</title><body>Cloudflare 524</body></html>'
    const err = classifyGeminiError(524, undefined, htmlMsg)
    expect(err.status).toBe(504)
    expect(err.code).toBe('GATEWAY_TIMEOUT')
    expect(err.message).not.toContain('rate limit')
    expect(err.message).not.toContain('<html>')
  })

  it('classifies HTTP 504 as GATEWAY_TIMEOUT with status 504', () => {
    const err = classifyGeminiError(504)
    expect(err.status).toBe(504)
    expect(err.code).toBe('GATEWAY_TIMEOUT')
  })

  it('classifies local AbortController timeout as REQUEST_TIMEOUT with status 504', () => {
    const err = classifyGeminiError(504, 'REQUEST_TIMEOUT')
    expect(err.status).toBe(504)
    expect(err.code).toBe('REQUEST_TIMEOUT')
    expect(err.message).toContain('timed out after request deadline')
  })

  it('classifies general HTTP 5xx errors as GEMINI_SERVICE_ERROR and strips raw HTML', () => {
    const err = classifyGeminiError(500, undefined, '<div>Internal Server Error</div>')
    expect(err.status).toBe(500)
    expect(err.code).toBe('GEMINI_SERVICE_ERROR')
    expect(err.message).not.toContain('<div>')
  })

  it('ensures single search execution and differentiates broader query parameter', () => {
    const targeted = buildGeminiSearchPrompt({
      role: 'ML Engineer',
      skills: ['PyTorch', 'TensorFlow'],
      location: 'San Francisco, CA',
      company: 'Scale AI',
      broader: false,
    })
    expect(targeted).toContain('San Francisco')
    expect(targeted).toContain('Scale AI')

    const broader = buildGeminiSearchPrompt({
      role: 'ML Engineer',
      skills: ['PyTorch', 'TensorFlow'],
      location: 'San Francisco, CA',
      company: 'Scale AI',
      broader: true,
    })
    expect(broader).not.toContain('San Francisco')
    expect(broader).not.toContain('Scale AI')
  })

  it('returns clean error when Supabase client is unconfigured', async () => {
    const res = await searchCandidatesWithGemini({ role: 'AI Engineer' })
    expect(res.success).toBe(false)
    expect(res.error).toBeDefined()
    expect(res.candidates).toHaveLength(0)
  })
})
