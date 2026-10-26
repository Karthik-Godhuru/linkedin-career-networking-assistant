export interface GroqCandidateResult {
  full_name: string
  headline?: string
  current_company?: string
  location?: string
  profile_url: string
  source_url: string
  snippet: string
  evidence_summary?: string
  verification_status: 'Found via Web Search — Needs Review'
  skills: string[]
}

export interface BuildNaturalLanguageQueryParams {
  role?: string
  skills?: string[]
  location?: string
  company?: string
  broader?: boolean
}

/**
 * Builds a natural-language semantic query describing publicly indexed LinkedIn professional profiles.
 * Avoids Google-specific syntax (e.g. site:) and exact-match quotes ("...") that degrade Exa search.
 * When broader=true, strips company and location constraints and focuses on role and primary skill.
 */
export function buildGroqNaturalLanguageQuery(params: BuildNaturalLanguageQueryParams): string {
  const role = (params.role || 'AI/ML Engineer').trim()
  const skills = Array.isArray(params.skills)
    ? params.skills.map((s) => s.trim()).filter(Boolean)
    : []
  const location = (params.location || '').trim()
  const company = (params.company || '').trim()

  if (params.broader) {
    const phrases: string[] = [`public LinkedIn member profile of a ${role}`]
    if (skills.length > 0) {
      phrases.push(`skilled in ${skills[0]}`)
    }
    return phrases.join(' ')
  }

  const phrases: string[] = [`public LinkedIn member profile of a ${role}`]
  if (skills.length > 0) {
    phrases.push(`skilled in ${skills.slice(0, 3).join(', ')}`)
  }
  if (location && !location.toLowerCase().includes('remote')) {
    phrases.push(`based in ${location}`)
  }
  if (company) {
    phrases.push(`working at ${company}`)
  }

  return phrases.join(' ')
}

export function isValidHttpUrl(candidateUrl: string): boolean {
  if (!candidateUrl || typeof candidateUrl !== 'string') return false
  try {
    const parsed = new URL(candidateUrl.trim())
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Validates that a URL is an authentic personal LinkedIn profile URL:
 * 1. Must parse as a valid URL with http: or https:
 * 2. Hostname must be exactly "linkedin.com" or end with ".linkedin.com" (e.g. www.linkedin.com, in.linkedin.com)
 * 3. Rejects lookalike hostnames (e.g. linkedin.com.example.org, evil-linkedin.com)
 * 4. Pathname must begin with "/in/" or "/pub/"
 * 5. Rejects non-personal pages (e.g. /company/, /school/, /jobs/, /pulse/, /feed/, /search/)
 * 6. Must contain a non-empty personal slug/identifier after /in/ or /pub/
 */
export function isValidLinkedInProfileUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false
  try {
    const parsed = new URL(urlStr.trim())
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false
    }

    const host = parsed.hostname.toLowerCase()
    const isLinkedInHost = host === 'linkedin.com' || host.endsWith('.linkedin.com')
    if (!isLinkedInHost) {
      return false
    }

    const pathname = parsed.pathname.toLowerCase()
    const isPersonalPath = pathname.startsWith('/in/') || pathname.startsWith('/pub/')
    if (!isPersonalPath) {
      return false
    }

    const identifier = pathname.replace(/^\/(in|pub)\/?/, '').replace(/\/+$/, '')
    if (!identifier || identifier.length < 2) {
      return false
    }

    return true
  } catch {
    return false
  }
}

export function sanitizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim())
    parsed.searchParams.delete('trk')
    parsed.searchParams.delete('trkInfo')
    parsed.searchParams.delete('originalSubdomain')
    parsed.searchParams.delete('miniProfileUrn')
    parsed.hash = ''
    if (parsed.pathname.endsWith('/') && parsed.pathname.length > 4) {
      parsed.pathname = parsed.pathname.slice(0, -1)
    }
    return parsed.toString()
  } catch {
    return rawUrl.trim()
  }
}

export type RejectionReason =
  | 'github_or_non_linkedin_url'
  | 'company_or_directory_page'
  | 'invalid_or_lookalike_hostname'
  | 'missing_or_malformed_url'
  | 'missing_or_placeholder_name'
  | 'missing_evidence_snippet'

export interface CandidateValidationOutcome {
  valid: boolean
  candidate?: GroqCandidateResult
  rejectionReason?: RejectionReason
  rejectionDetail?: string
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

export function validateAndNormalizeCandidate(
  raw: RawCandidateOutput
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

  // A personal LinkedIn profile URL MUST be verified
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
          rejectionDetail: 'LinkedIn company, organization, or directory pages are not personal profiles',
        }
      }

      return {
        valid: false,
        rejectionReason: 'github_or_non_linkedin_url',
        rejectionDetail: 'LinkedIn URL path is not a personal profile (/in/ or /pub/)',
      }
    } catch {
      return {
        valid: false,
        rejectionReason: 'missing_or_malformed_url',
        rejectionDetail: 'Malformed or unparseable URL provided',
      }
    }
  }

  // Preserve source URL separately; if missing or invalid, fall back to the LinkedIn profile URL
  let sourceUrl = linkedinProfileUrl
  if (rawSourceUrl && isValidHttpUrl(rawSourceUrl)) {
    sourceUrl = rawSourceUrl
  }

  const headline = typeof raw.headline === 'string' && raw.headline.trim() ? raw.headline.trim() : undefined
  const company = typeof raw.current_company === 'string' && raw.current_company.trim() ? raw.current_company.trim() : undefined
  const location = typeof raw.location === 'string' && raw.location.trim() ? raw.location.trim() : undefined
  const evidenceSummary = typeof raw.evidence_summary === 'string' && raw.evidence_summary.trim() ? raw.evidence_summary.trim() : undefined

  const skills = Array.isArray(raw.skills)
    ? raw.skills.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []

  return {
    valid: true,
    candidate: {
      full_name: name,
      headline,
      current_company: company,
      location,
      profile_url: sanitizeUrl(linkedinProfileUrl),
      source_url: sanitizeUrl(sourceUrl),
      snippet,
      evidence_summary: evidenceSummary,
      verification_status: 'Found via Web Search — Needs Review',
      skills,
    },
  }
}

/**
 * Extracts candidate objects from structured JSON text.
 */
export function extractJsonFromResponse(content: string): unknown[] {
  if (!content || !content.trim()) return []

  const trimmed = content.trim()

  // Match ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed

  try {
    const parsed = JSON.parse(jsonText)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { candidates?: unknown[] }).candidates)) {
      return (parsed as { candidates: unknown[] }).candidates
    }
    return []
  } catch {
    // Attempt greedy array extraction between [ and ]
    const start = jsonText.indexOf('[')
    const end = jsonText.lastIndexOf(']')
    if (start !== -1 && end > start) {
      try {
        const sliced = jsonText.slice(start, end + 1)
        const parsed = JSON.parse(sliced)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // Fall through to empty array
      }
    }
    return []
  }
}

/**
 * Fallback parser for plain text and Markdown citations/links.
 * Extracts candidate details when the model responds in conversational or bullet-point markdown.
 */
export function extractCandidatesFromMarkdown(content: string): RawCandidateOutput[] {
  if (!content || !content.trim()) return []

  const candidates: RawCandidateOutput[] = []

  // Split content by numbered lists (1. , 2. ), bullet points (* , - ), or double newlines
  const rawBlocks = content.split(/(?:\r?\n){2,}|(?=\n\s*\d+\.\s)|\n(?=\s*[-*]\s+\*\*)/)

  for (const block of rawBlocks) {
    const trimmed = block.trim()
    if (!trimmed || trimmed.length < 15) continue

    // Find Markdown links: [Link Text](https://...)
    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
    const rawUrlRegex = /(https?:\/\/[^\s<>"')]+)/g

    let profileUrl = ''
    let sourceUrl = ''
    let linkName = ''

    let match: RegExpExecArray | null
    while ((match = mdLinkRegex.exec(trimmed)) !== null) {
      const text = match[1].trim()
      const url = match[2].trim()

      if (isValidLinkedInProfileUrl(url)) {
        profileUrl = url
        sourceUrl = url
        // If the link text is a person's name (and not a generic label like "LinkedIn" or "Profile")
        const isGeneric =
          /^(linkedin(\s+profile)?|profile|personal\s+profile|link|view(\s+profile)?|source|url|here|page|member)$/i.test(text.toLowerCase()) ||
          text.toLowerCase().includes('linkedin') ||
          text.toLowerCase().includes('profile')

        if (!isGeneric && text.length >= 2) {
          linkName = text.replace(/[*_#]/g, '').trim()
        }
        break
      } else if (!sourceUrl && isValidHttpUrl(url)) {
        sourceUrl = url
      }
    }

    // If no markdown link had a LinkedIn URL, check for raw URLs in text
    if (!profileUrl) {
      while ((match = rawUrlRegex.exec(trimmed)) !== null) {
        const url = match[1].trim()
        if (isValidLinkedInProfileUrl(url)) {
          profileUrl = url
          if (!sourceUrl) sourceUrl = url
          break
        } else if (!sourceUrl && isValidHttpUrl(url)) {
          sourceUrl = url
        }
      }
    }

    // Must have found a URL candidate in this block
    if (!profileUrl && !sourceUrl) continue

    // Extract Candidate Full Name
    // 1. Check for bolded name first: **Dr. Elena Vance** or 1. **Sarah Lin**
    let fullName = ''
    const boldMatch = trimmed.match(/\*\*([A-Za-z\s.'-]+?)\*\*/)
    if (
      boldMatch &&
      boldMatch[1].length >= 2 &&
      !/^(role|company|skills|location|profile|snippet|headline|note|evidence|summary)/i.test(boldMatch[1])
    ) {
      fullName = boldMatch[1].trim()
    }

    // 2. Fall back to link text if genuine name
    if (!fullName && linkName) {
      fullName = linkName
    }

    // 3. Fall back to leading name pattern: "1. Sarah Lin - " or "Alex Chen:"
    if (!fullName) {
      const leadingNameMatch = trimmed.match(/^(?:\d+\.\s*|[-*]\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+)+)/m)
      if (leadingNameMatch) {
        fullName = leadingNameMatch[1].trim()
      }
    }

    // Extract Headline / Role
    let headline: string | undefined
    const explicitRoleMatch = trimmed.match(/(?:headline|role|title):\s*([^\n]+)/i)
    if (explicitRoleMatch) {
      headline = explicitRoleMatch[1].replace(/[*_]/g, '').trim()
    } else {
      // Try to find text after dash: "**Name** - Senior ML Engineer"
      const dashMatch = trimmed.match(/(?:\*\*[^*]+\*\*\s*[-–:]\s*)([^\n]+)/)
      if (dashMatch) {
        headline = dashMatch[1].replace(/[*_]/g, '').trim()
      }
    }

    // Extract Company
    let company: string | undefined
    const compMatch =
      trimmed.match(/(?:company|employer|at):\s*([^\n,]+)/i) ||
      trimmed.match(/\bat\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s*[,.(]|\s+in\s+|$)/)
    if (compMatch) {
      company = compMatch[1].replace(/[*_]/g, '').trim()
    }

    // Extract Location
    let location: string | undefined
    const explicitLoc = trimmed.match(/(?:location):\s*([^\n]+)/i)
    if (explicitLoc) {
      location = explicitLoc[1].replace(/[*_]/g, '').trim()
    } else {
      const inlineLoc =
        trimmed.match(/based in\s+([A-Za-z\s]+?)(?:,\s*[A-Z]{2}|\.|\n|$)/i) ||
        trimmed.match(/\bin\s+([A-Z][a-zA-Z\s]+?)(?:,\s*[A-Z]{2})/i)
      if (inlineLoc) {
        location = inlineLoc[1].replace(/[*_]/g, '').trim()
      }
    }

    // Use cleaned block text as evidence snippet
    const snippet = trimmed
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // unwrap markdown links to plain text
      .replace(/[*_#]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300)

    candidates.push({
      full_name: fullName || 'Unknown Candidate',
      headline,
      current_company: company,
      location,
      profile_url: profileUrl || sourceUrl,
      source_url: sourceUrl || profileUrl,
      snippet,
      evidence_summary: `Discovered in web search results.`,
    })
  }

  return candidates
}

export interface GroqParseResult {
  candidates: RawCandidateOutput[]
  format: 'json' | 'markdown' | 'empty'
}

/**
 * Universal dual-path response parser.
 * Attempts structured JSON extraction first; falls back to Markdown citation parsing.
 */
export function parseGroqCandidateResponse(content: string): GroqParseResult {
  if (!content || !content.trim()) {
    return { candidates: [], format: 'empty' }
  }

  // Path 1: Try structured JSON array extraction
  const jsonCandidates = extractJsonFromResponse(content)
  if (jsonCandidates.length > 0) {
    return {
      candidates: jsonCandidates as RawCandidateOutput[],
      format: 'json',
    }
  }

  // Path 2: Fallback to Markdown / plain text citation extraction
  const markdownCandidates = extractCandidatesFromMarkdown(content)
  if (markdownCandidates.length > 0) {
    return {
      candidates: markdownCandidates,
      format: 'markdown',
    }
  }

  return { candidates: [], format: 'empty' }
}

export interface CandidateRejectionCounts {
  githubOrNonLinkedIn: number
  companyOrDirectory: number
  missingOrMalformedUrl: number
  missingEvidence: number
  invalidName: number
}

export interface BatchProcessResult {
  validatedCandidates: GroqCandidateResult[]
  totalUrlsExtracted: number
  rejectedCount: number
  duplicatesFiltered: number
  rejectionBreakdown: CandidateRejectionCounts
}

/**
 * Validates, normalizes, deduplicates, and tallies diagnostics for a batch of candidate records.
 */
export function processCandidateBatch(
  rawCandidates: RawCandidateOutput[],
  existingSeenUrls?: Set<string>
): BatchProcessResult {
  const validatedCandidates: GroqCandidateResult[] = []
  const seenUrls = existingSeenUrls || new Set<string>()

  const rejectionBreakdown: CandidateRejectionCounts = {
    githubOrNonLinkedIn: 0,
    companyOrDirectory: 0,
    missingOrMalformedUrl: 0,
    missingEvidence: 0,
    invalidName: 0,
  }

  let rejectedCount = 0
  let totalUrlsExtracted = 0
  let duplicatesFiltered = 0

  for (const item of rawCandidates) {
    if (item.profile_url || item.source_url) {
      totalUrlsExtracted++
    }

    const result = validateAndNormalizeCandidate(item)
    if (result.valid && result.candidate) {
      const normUrl = result.candidate.profile_url.toLowerCase()
      if (!seenUrls.has(normUrl)) {
        seenUrls.add(normUrl)
        validatedCandidates.push(result.candidate)
      } else {
        duplicatesFiltered++
      }
    } else {
      rejectedCount++
      const reason: RejectionReason | undefined = result.rejectionReason
      if (reason === 'github_or_non_linkedin_url' || reason === 'invalid_or_lookalike_hostname') {
        rejectionBreakdown.githubOrNonLinkedIn++
      } else if (reason === 'company_or_directory_page') {
        rejectionBreakdown.companyOrDirectory++
      } else if (reason === 'missing_evidence_snippet') {
        rejectionBreakdown.missingEvidence++
      } else if (reason === 'missing_or_placeholder_name') {
        rejectionBreakdown.invalidName++
      } else {
        rejectionBreakdown.missingOrMalformedUrl++
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

export type GroqErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'GATEWAY_TIMEOUT'
  | 'REQUEST_TIMEOUT'
  | 'INVALID_API_KEY'
  | 'GROQ_SERVICE_ERROR'
  | 'NETWORK_ERROR'

export interface ClassifiedError {
  status: number
  code: GroqErrorCode
  message: string
}

/**
 * Classifies Groq API and network errors into user-safe status codes and messages.
 * Prevents raw upstream HTML (such as Cloudflare 524 timeout pages) and sensitive tokens from leaking.
 */
export function classifyGroqError(
  status: number,
  rawCode?: string,
  rawMsg?: string
): ClassifiedError {
  if (status === 429 || rawCode === 'RATE_LIMIT_EXCEEDED') {
    return {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Groq API rate limit reached. Please wait a minute and try again.',
    }
  }

  if (rawCode === 'REQUEST_TIMEOUT') {
    return {
      status: 504,
      code: 'REQUEST_TIMEOUT',
      message: 'Groq search timed out after 100 seconds. Please try again with more concise terms.',
    }
  }

  if (status === 524 || status === 504 || rawCode === 'GATEWAY_TIMEOUT') {
    return {
      status: 504,
      code: 'GATEWAY_TIMEOUT',
      message: 'Groq search timed out upstream. Please try again with more concise search terms.',
    }
  }

  if (status === 401 || rawCode === 'INVALID_API_KEY') {
    return {
      status: 500,
      code: 'INVALID_API_KEY',
      message: 'Groq API authentication failed. Please verify the GROQ_API_KEY secret.',
    }
  }

  if (rawCode === 'NETWORK_ERROR') {
    return {
      status: 502,
      code: 'NETWORK_ERROR',
      message: 'Failed to reach Groq search service. Please check your connection and try again.',
    }
  }

  // Sanitize upstream error text to prevent leaking raw Cloudflare HTML or internal traces
  const isHtml = typeof rawMsg === 'string' && (rawMsg.includes('<') || rawMsg.includes('<!DOCTYPE') || rawMsg.includes('Cloudflare'))
  const safeMsg =
    !isHtml && typeof rawMsg === 'string' && rawMsg.trim().length > 0 && rawMsg.length < 150
      ? rawMsg.trim()
      : `Groq search service error (${status || 500}). Please try again later.`

  return {
    status: status >= 500 && status < 600 ? status : 502,
    code: 'GROQ_SERVICE_ERROR',
    message: safeMsg,
  }
}
