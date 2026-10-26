import { isValidLinkedInProfileUrl, isValidHttpUrl, sanitizeUrl } from './groqSearch.ts'

export { isValidLinkedInProfileUrl, isValidHttpUrl, sanitizeUrl }

export interface GeminiSearchParams {
  role?: string
  skills?: string[]
  location?: string
  company?: string
  broader?: boolean
}

export interface GeminiCitation {
  url: string
  title?: string
  startIndex?: number
  endIndex?: number
}

export type GeminiRejectionReason =
  | 'github_or_non_linkedin_url'
  | 'company_or_directory_page'
  | 'invalid_or_lookalike_hostname'
  | 'missing_or_malformed_url'
  | 'missing_or_placeholder_name'
  | 'missing_evidence_snippet'
  | 'not_in_citation_allowlist'

export interface GeminiRejectionBreakdown {
  githubOrNonLinkedIn: number
  companyOrDirectory: number
  missingOrMalformedUrl: number
  missingEvidence: number
  invalidName: number
  notInCitationAllowList: number
}

export interface GeminiDiscoveredCandidate {
  full_name: string
  headline?: string
  current_company?: string
  location?: string
  profile_url: string
  source_url: string
  snippet: string
  evidence_summary?: string
  verification_status: 'Found via Web Search — Needs Review'
  skills?: string[]
}

export interface RawCandidateOutput {
  full_name?: unknown
  headline?: unknown
  current_company?: unknown
  location?: unknown
  profile_url?: unknown
  source_url?: unknown
  snippet?: unknown
  evidence_summary?: unknown
  skills?: unknown
}

export interface CandidateValidationOutcome {
  valid: boolean
  candidate?: GeminiDiscoveredCandidate
  rejectionReason?: GeminiRejectionReason
  rejectionDetail?: string
}

export interface BatchProcessResult {
  validatedCandidates: GeminiDiscoveredCandidate[]
  totalUrlsExtracted: number
  rejectedCount: number
  duplicatesFiltered: number
  rejectionBreakdown: GeminiRejectionBreakdown
}

export interface GeminiParseResult {
  candidates: RawCandidateOutput[]
  citations: GeminiCitation[]
  format: 'json' | 'markdown' | 'empty'
}

export type GeminiErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'AUTH_OR_PERMISSION_ERROR'
  | 'MODEL_NOT_FOUND'
  | 'GATEWAY_TIMEOUT'
  | 'REQUEST_TIMEOUT'
  | 'GEMINI_SERVICE_ERROR'
  | 'NETWORK_ERROR'

export interface ClassifiedGeminiError {
  status: number
  code: GeminiErrorCode
  message: string
}

/**
 * Builds a concise prompt for Gemini API with Google Search grounding.
 */
export function buildGeminiSearchPrompt(params: GeminiSearchParams): string {
  const role = (params.role || 'AI/ML Engineer').trim()
  const skills = Array.isArray(params.skills)
    ? params.skills.map((s) => s.trim()).filter(Boolean)
    : []
  const location = (params.location || '').trim()
  const company = (params.company || '').trim()

  const lines: string[] = [
    `Search Google for authentic, publicly indexed personal LinkedIn profiles (linkedin.com/in/ or linkedin.com/pub/) of professionals matching:`,
    `- Target Role: ${role}`,
  ]

  if (skills.length > 0) {
    lines.push(`- Key Skills: ${params.broader ? skills[0] : skills.slice(0, 4).join(', ')}`)
  }

  if (location && !params.broader && !location.toLowerCase().includes('remote')) {
    lines.push(`- Location: ${location}`)
  }

  if (company && !params.broader) {
    lines.push(`- Target Company: ${company}`)
  }

  lines.push('')
  lines.push('GROUNDING & VERIFICATION RULES:')
  lines.push('1. PERSONAL LINKEDIN PROFILES ONLY: Return only real people with genuine personal LinkedIn member URLs starting with https://www.linkedin.com/in/, https://[country].linkedin.com/in/, or /pub/.')
  lines.push('2. REJECT NON-PERSONAL LINKS: Never return GitHub links, personal portfolios, Twitter/X, or LinkedIn company/directory pages (/company/, /school/, /jobs/).')
  lines.push('3. EVIDENCE GROUNDING: Every profile URL must come directly from your retrieved Google Search results. Never invent, hallucinate, or construct a URL from a person\'s name.')
  lines.push('4. EVIDENCE SNIPPET: Include a verbatim or near-verbatim snippet excerpt from the search result confirming the person\'s role and experience.')
  lines.push('5. OUTPUT FORMAT: Output a JSON array inside a ```json ... ``` codeblock (or clear Markdown bullet points). Each candidate object must have: "full_name", "headline", "current_company", "location", "profile_url", "snippet", "skills".')
  lines.push('6. If no eligible personal LinkedIn profiles are found in search results, return an empty array: []')

  return lines.join('\n')
}

/**
 * Extracts citations and response text from Gemini Interactions API or generateContent response.
 */
export function extractCitationsAndText(
  responseJson: unknown
): { fullText: string; citations: GeminiCitation[] } {
  if (!responseJson || typeof responseJson !== 'object') {
    return { fullText: '', citations: [] }
  }

  const citations: GeminiCitation[] = []
  let fullText = ''

  const obj = responseJson as Record<string, unknown>

  // 1. Interactions API format: steps -> content -> annotations (type: "url_citation")
  if (Array.isArray(obj.steps)) {
    for (const step of obj.steps) {
      if (step && typeof step === 'object') {
        const stepObj = step as Record<string, unknown>
        if (Array.isArray(stepObj.content)) {
          for (const item of stepObj.content) {
            if (item && typeof item === 'object') {
              const itemObj = item as Record<string, unknown>
              if (itemObj.type === 'text' && typeof itemObj.text === 'string') {
                fullText += (fullText ? '\n' : '') + itemObj.text

                if (Array.isArray(itemObj.annotations)) {
                  for (const ann of itemObj.annotations) {
                    if (ann && typeof ann === 'object') {
                      const annObj = ann as Record<string, unknown>
                      if (annObj.type === 'url_citation' && typeof annObj.url === 'string') {
                        citations.push({
                          url: annObj.url,
                          title: typeof annObj.title === 'string' ? annObj.title : undefined,
                          startIndex: typeof annObj.start_index === 'number'
                            ? annObj.start_index
                            : typeof annObj.startIndex === 'number'
                            ? annObj.startIndex
                            : undefined,
                          endIndex: typeof annObj.end_index === 'number'
                            ? annObj.end_index
                            : typeof annObj.endIndex === 'number'
                            ? annObj.endIndex
                            : undefined,
                        })
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // 2. generateContent / groundingMetadata format fallback
  if (Array.isArray(obj.candidates)) {
    for (const cand of obj.candidates) {
      if (cand && typeof cand === 'object') {
        const candObj = cand as Record<string, unknown>

        // Candidate content parts
        const content = candObj.content as Record<string, unknown> | undefined
        if (content && Array.isArray(content.parts)) {
          for (const part of content.parts) {
            if (part && typeof part === 'object') {
              const partObj = part as Record<string, unknown>
              if (typeof partObj.text === 'string') {
                fullText += (fullText ? '\n' : '') + partObj.text
              }
            }
          }
        }

        // Grounding metadata chunks
        const grounding = candObj.groundingMetadata as Record<string, unknown> | undefined
        if (grounding && Array.isArray(grounding.groundingChunks)) {
          for (const chunk of grounding.groundingChunks) {
            if (chunk && typeof chunk === 'object') {
              const chunkObj = chunk as Record<string, unknown>
              const web = chunkObj.web as Record<string, unknown> | undefined
              if (web && typeof web.uri === 'string') {
                citations.push({
                  url: web.uri,
                  title: typeof web.title === 'string' ? web.title : undefined,
                })
              }
            }
          }
        }

        // Citation metadata sources
        const citationMeta = candObj.citationMetadata as Record<string, unknown> | undefined
        if (citationMeta && Array.isArray(citationMeta.citationSources)) {
          for (const source of citationMeta.citationSources) {
            if (source && typeof source === 'object') {
              const srcObj = source as Record<string, unknown>
              if (typeof srcObj.uri === 'string') {
                citations.push({
                  url: srcObj.uri,
                  title: typeof srcObj.title === 'string' ? srcObj.title : undefined,
                  startIndex: typeof srcObj.startIndex === 'number' ? srcObj.startIndex : undefined,
                  endIndex: typeof srcObj.endIndex === 'number' ? srcObj.endIndex : undefined,
                })
              }
            }
          }
        }
      }
    }
  }

  // 3. Simple text property fallback if provided directly
  if (!fullText && typeof obj.output_text === 'string') {
    fullText = obj.output_text
  } else if (!fullText && typeof obj.text === 'string') {
    fullText = obj.text
  }

  return { fullText, citations }
}

/**
 * Extracts raw candidate objects from JSON in text.
 */
export function extractJsonFromText(text: string): RawCandidateOutput[] {
  if (!text || !text.trim()) return []

  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi
  let match: RegExpExecArray | null

  while ((match = jsonBlockRegex.exec(text)) !== null) {
    const rawSnippet = match[1].trim()
    try {
      const parsed = JSON.parse(rawSnippet)
      if (Array.isArray(parsed)) {
        return parsed as RawCandidateOutput[]
      } else if (parsed && typeof parsed === 'object') {
        const candidates = (parsed as Record<string, unknown>).candidates
        if (Array.isArray(candidates)) {
          return candidates as RawCandidateOutput[]
        }
      }
    } catch {
      // Continue searching
    }
  }

  // Fallback: look for direct JSON array
  const arrayStart = text.indexOf('[')
  const arrayEnd = text.lastIndexOf(']')
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    try {
      const parsed = JSON.parse(text.slice(arrayStart, arrayEnd + 1))
      if (Array.isArray(parsed)) {
        return parsed as RawCandidateOutput[]
      }
    } catch {
      // Continue
    }
  }

  return []
}

/**
 * Extracts raw candidate objects from Markdown text when JSON is absent.
 */
export function extractMarkdownCandidates(
  text: string,
  citations: GeminiCitation[]
): RawCandidateOutput[] {
  if (!text || !text.trim()) return []

  const candidates: RawCandidateOutput[] = []
  const blocks = text.split(/(?:\r?\n){2,}|(?=\n\s*\d+\.\s)|\n(?=\s*[-*]\s+\*\*)/)

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed || trimmed.length < 15) continue

    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
    let profileUrl = ''
    let sourceUrl = ''
    let linkName = ''

    let match: RegExpExecArray | null
    while ((match = mdLinkRegex.exec(trimmed)) !== null) {
      const linkText = match[1].trim()
      const url = match[2].trim()

      if (isValidLinkedInProfileUrl(url)) {
        profileUrl = url
        sourceUrl = url
        const isGeneric =
          /^(linkedin(\s+profile)?|profile|personal\s+profile|link|view|source|url|here|page|member)$/i.test(linkText.toLowerCase()) ||
          linkText.toLowerCase().includes('linkedin')
        if (!isGeneric && linkText.length >= 2) {
          linkName = linkText.replace(/[*_#]/g, '').trim()
        }
        break
      } else if (!sourceUrl && isValidHttpUrl(url)) {
        sourceUrl = url
      }
    }

    // Name extraction
    let fullName = linkName
    if (!fullName) {
      const boldMatch = trimmed.match(/\*\*([A-Z][a-zA-Z'.\- ]{1,40})\*\*/)
      if (boldMatch) {
        fullName = boldMatch[1].trim()
      } else {
        const headerMatch = trimmed.match(/^(?:#+\s*|\d+\.\s+)?([A-Z][a-zA-Z'.\- ]{2,35})(?:\s*[-–—|:]|\s+\()/m)
        if (headerMatch) {
          fullName = headerMatch[1].trim()
        }
      }
    }

    // Headline extraction
    let headline = ''
    const headlineMatch = trimmed.match(/(?:headline|role|title|position):\s*([^\n\r]+)/i)
    if (headlineMatch) {
      headline = headlineMatch[1].replace(/[*_]/g, '').trim()
    } else {
      const dashMatch = trimmed.match(/\*\*[^*]+\*\*\s*[-–—:]\s*([^\n\r,.(]+)/)
      if (dashMatch) {
        headline = dashMatch[1].trim()
      }
    }

    // Company extraction
    let company = ''
    const companyMatch = trimmed.match(/(?:company|employer|at|works at):\s*([^\n\r,]+)/i)
    if (companyMatch) {
      company = companyMatch[1].replace(/[*_]/g, '').trim()
    }

    // Location extraction
    let location = ''
    const locationMatch = trimmed.match(/(?:location|based in):\s*([^\n\r,]+)/i)
    if (locationMatch) {
      location = locationMatch[1].replace(/[*_]/g, '').trim()
    }

    if (fullName || profileUrl) {
      candidates.push({
        full_name: fullName,
        headline: headline || undefined,
        current_company: company || undefined,
        location: location || undefined,
        profile_url: profileUrl,
        source_url: sourceUrl || profileUrl,
        snippet: trimmed.slice(0, 300),
      })
    }
  }

  // If no Markdown candidates were found, check if citations contain personal LinkedIn profiles
  if (candidates.length === 0 && citations.length > 0) {
    for (const cit of citations) {
      if (isValidLinkedInProfileUrl(cit.url)) {
        let name = ''
        if (cit.title) {
          const titleName = cit.title.split(/[-–—|:]|\s+on\s+LinkedIn/i)[0].trim()
          if (titleName.length >= 2 && !/^(linkedin|profile|member)$/i.test(titleName)) {
            name = titleName
          }
        }
        candidates.push({
          full_name: name || 'LinkedIn Professional',
          profile_url: cit.url,
          source_url: cit.url,
          snippet: cit.title || `Retrieved from Google Search citation: ${cit.url}`,
        })
      }
    }
  }

  return candidates
}

/**
 * Validates a candidate and verifies that their LinkedIn profile URL is grounded in the citation allow-list.
 */
export function validateAndNormalizeCandidate(
  raw: RawCandidateOutput,
  citationAllowList: Set<string>
): CandidateValidationOutcome {
  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      rejectionReason: 'missing_or_malformed_url',
      rejectionDetail: 'Invalid candidate structure',
    }
  }

  const name = typeof raw.full_name === 'string' ? raw.full_name.trim() : ''
  if (!name || name.length < 2 || /^(unknown|n\/a|placeholder|john doe|jane doe|candidate)$/i.test(name)) {
    return {
      valid: false,
      rejectionReason: 'missing_or_placeholder_name',
      rejectionDetail: 'Candidate name is missing, empty, or a generic placeholder',
    }
  }

  const snippet = typeof raw.snippet === 'string' ? raw.snippet.trim() : ''
  if (!snippet || snippet.length < 8) {
    return {
      valid: false,
      rejectionReason: 'missing_evidence_snippet',
      rejectionDetail: 'Result lacks a verifiable evidence snippet extracted from search',
    }
  }

  const rawProfileUrl = typeof raw.profile_url === 'string' ? raw.profile_url.trim() : ''
  const rawSourceUrl = typeof raw.source_url === 'string' ? raw.source_url.trim() : ''

  let linkedinProfileUrl = ''
  if (isValidLinkedInProfileUrl(rawProfileUrl)) {
    linkedinProfileUrl = rawProfileUrl
  } else if (isValidLinkedInProfileUrl(rawSourceUrl)) {
    linkedinProfileUrl = rawSourceUrl
  }

  if (!linkedinProfileUrl) {
    if (!rawProfileUrl && !rawSourceUrl) {
      return {
        valid: false,
        rejectionReason: 'missing_or_malformed_url',
        rejectionDetail: 'No profile or source URL was provided',
      }
    }

    const candidateUrlToCheck = rawProfileUrl || rawSourceUrl
    try {
      const parsed = new URL(candidateUrlToCheck)
      const host = parsed.hostname.toLowerCase()
      const path = parsed.pathname.toLowerCase()

      if (host.includes('github.com')) {
        return {
          valid: false,
          rejectionReason: 'github_or_non_linkedin_url',
          rejectionDetail: 'Result points to a GitHub profile, not a personal LinkedIn profile',
        }
      }

      const isLinkedInHost = host === 'linkedin.com' || host.endsWith('.linkedin.com')
      if (!isLinkedInHost) {
        if (host.includes('linkedin.com')) {
          return {
            valid: false,
            rejectionReason: 'invalid_or_lookalike_hostname',
            rejectionDetail: `URL domain "${host}" is an invalid lookalike domain`,
          }
        }
        return {
          valid: false,
          rejectionReason: 'github_or_non_linkedin_url',
          rejectionDetail: `URL domain "${host}" is not linkedin.com`,
        }
      }

      if (
        path.startsWith('/company/') ||
        path.startsWith('/school/') ||
        path.startsWith('/jobs/') ||
        path.startsWith('/pulse/') ||
        path.startsWith('/search/')
      ) {
        return {
          valid: false,
          rejectionReason: 'company_or_directory_page',
          rejectionDetail: `LinkedIn page "${path}" is a company or directory page, not a personal member profile`,
        }
      }

      return {
        valid: false,
        rejectionReason: 'missing_or_malformed_url',
        rejectionDetail: `Path "${path}" is not a personal profile (/in/ or /pub/)`,
      }
    } catch {
      return {
        valid: false,
        rejectionReason: 'missing_or_malformed_url',
        rejectionDetail: 'URL is malformed or invalid',
      }
    }
  }

  // ENFORCE CITATION ALLOW-LIST:
  // Candidate's profile URL must be supported by the citations retrieved from Google Search grounding
  const sanitizedProfileUrl = sanitizeUrl(linkedinProfileUrl)
  const isEvidencedInCitations =
    citationAllowList.has(sanitizedProfileUrl) ||
    citationAllowList.has(linkedinProfileUrl) ||
    Array.from(citationAllowList).some((citationUrl) => {
      return (
        citationUrl === sanitizedProfileUrl ||
        citationUrl.replace(/\/$/, '') === sanitizedProfileUrl.replace(/\/$/, '')
      )
    })

  if (!isEvidencedInCitations && citationAllowList.size > 0) {
    return {
      valid: false,
      rejectionReason: 'not_in_citation_allowlist',
      rejectionDetail: 'Profile URL is not present in Gemini Google Search grounding source citations',
    }
  }

  const headline = typeof raw.headline === 'string' ? raw.headline.trim() : undefined
  const current_company = typeof raw.current_company === 'string' ? raw.current_company.trim() : undefined
  const location = typeof raw.location === 'string' ? raw.location.trim() : undefined
  const evidence_summary = typeof raw.evidence_summary === 'string' ? raw.evidence_summary.trim() : undefined
  const skills = Array.isArray(raw.skills)
    ? raw.skills.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : undefined

  const sourceUrl = rawSourceUrl && isValidHttpUrl(rawSourceUrl) ? rawSourceUrl : sanitizedProfileUrl

  return {
    valid: true,
    candidate: {
      full_name: name,
      headline,
      current_company,
      location,
      profile_url: sanitizedProfileUrl,
      source_url: sourceUrl,
      snippet,
      evidence_summary,
      verification_status: 'Found via Web Search — Needs Review',
      skills,
    },
  }
}

/**
 * Processes a batch of raw candidate outputs with deduplication and validation.
 */
export function processCandidateBatch(
  rawCandidates: RawCandidateOutput[],
  citationAllowList: Set<string>,
  existingSeenUrls?: Set<string>
): BatchProcessResult {
  const validatedCandidates: GeminiDiscoveredCandidate[] = []
  const seenCanonicalUrls = new Set<string>(existingSeenUrls || [])
  let totalUrlsExtracted = 0
  let duplicatesFiltered = 0
  let rejectedCount = 0

  const rejectionBreakdown: GeminiRejectionBreakdown = {
    githubOrNonLinkedIn: 0,
    companyOrDirectory: 0,
    missingOrMalformedUrl: 0,
    missingEvidence: 0,
    invalidName: 0,
    notInCitationAllowList: 0,
  }

  for (const raw of rawCandidates) {
    if (raw.profile_url || raw.source_url) {
      totalUrlsExtracted++
    }

    const outcome = validateAndNormalizeCandidate(raw, citationAllowList)

    if (outcome.valid && outcome.candidate) {
      const canonicalKey = outcome.candidate.profile_url.toLowerCase().replace(/\/$/, '')

      if (seenCanonicalUrls.has(canonicalKey)) {
        duplicatesFiltered++
      } else {
        seenCanonicalUrls.add(canonicalKey)
        validatedCandidates.push(outcome.candidate)
      }
    } else {
      rejectedCount++
      const reason = outcome.rejectionReason
      if (reason === 'github_or_non_linkedin_url' || reason === 'invalid_or_lookalike_hostname') {
        rejectionBreakdown.githubOrNonLinkedIn++
      } else if (reason === 'company_or_directory_page') {
        rejectionBreakdown.companyOrDirectory++
      } else if (reason === 'missing_or_malformed_url') {
        rejectionBreakdown.missingOrMalformedUrl++
      } else if (reason === 'missing_evidence_snippet') {
        rejectionBreakdown.missingEvidence++
      } else if (reason === 'missing_or_placeholder_name') {
        rejectionBreakdown.invalidName++
      } else if (reason === 'not_in_citation_allowlist') {
        rejectionBreakdown.notInCitationAllowList++
      }
    }
  }

  return {
    validatedCandidates,
    totalUrlsExtracted,
    rejectedCount,
    duplicatesFiltered,
    rejectionBreakdown,
  }
}

/**
 * Parses Gemini response payload, extracts citations and candidates.
 */
export function parseGeminiResponse(responseJson: unknown): GeminiParseResult {
  const { fullText, citations } = extractCitationsAndText(responseJson)

  // Try JSON parsing first
  const jsonCandidates = extractJsonFromText(fullText)
  if (jsonCandidates.length > 0) {
    return {
      candidates: jsonCandidates,
      citations,
      format: 'json',
    }
  }

  // Fallback to Markdown extraction
  const mdCandidates = extractMarkdownCandidates(fullText, citations)
  if (mdCandidates.length > 0) {
    return {
      candidates: mdCandidates,
      citations,
      format: 'markdown',
    }
  }

  return {
    candidates: [],
    citations,
    format: 'empty',
  }
}

/**
 * Classifies Gemini API errors into status codes and safe, informative messages.
 * Prevents raw upstream HTML and API keys from leaking to client.
 */
export function classifyGeminiError(
  status: number,
  rawCode?: string,
  rawMsg?: string
): ClassifiedGeminiError {
  if (status === 429 || rawCode === 'RATE_LIMIT_EXCEEDED') {
    return {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Gemini API rate limit reached. Please wait a minute and try again.',
    }
  }

  if (rawCode === 'REQUEST_TIMEOUT') {
    return {
      status: 504,
      code: 'REQUEST_TIMEOUT',
      message: 'Gemini search timed out after request deadline. Please try again with more concise terms.',
    }
  }

  if (status === 524 || status === 504 || rawCode === 'GATEWAY_TIMEOUT') {
    return {
      status: 504,
      code: 'GATEWAY_TIMEOUT',
      message: 'Gemini search timed out upstream. Please try again with more concise search terms.',
    }
  }

  if (status === 401 || status === 403 || rawCode === 'AUTH_OR_PERMISSION_ERROR' || rawCode === 'INVALID_API_KEY') {
    return {
      status: 403,
      code: 'AUTH_OR_PERMISSION_ERROR',
      message: 'Gemini API authentication or permission failed. Please verify the GEMINI_API_KEY secret.',
    }
  }

  if (status === 404 || rawCode === 'MODEL_NOT_FOUND') {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      message: 'Configured Gemini model was not found in your API project. Please check the GEMINI_MODEL setting.',
    }
  }

  if (rawCode === 'NETWORK_ERROR') {
    return {
      status: 502,
      code: 'NETWORK_ERROR',
      message: 'Failed to reach Gemini search service. Please check your connection and try again.',
    }
  }

  const isHtml =
    typeof rawMsg === 'string' &&
    (rawMsg.includes('<') || rawMsg.includes('<!DOCTYPE') || rawMsg.includes('Cloudflare') || rawMsg.includes('Google'))

  const safeMsg =
    !isHtml && typeof rawMsg === 'string' && rawMsg.trim().length > 0 && rawMsg.length < 150
      ? rawMsg.trim()
      : `Gemini search service error (${status || 500}). Please try again later.`

  return {
    status: status >= 500 && status < 600 ? status : 502,
    code: 'GEMINI_SERVICE_ERROR',
    message: safeMsg,
  }
}
