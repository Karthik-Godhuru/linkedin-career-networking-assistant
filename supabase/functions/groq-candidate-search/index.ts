import { corsHeaders } from '../_shared/cors.ts'
import { getAuthenticatedUser } from '../_shared/supabaseServer.ts'
import {
  buildGroqNaturalLanguageQuery,
  classifyGroqError,
  parseGroqCandidateResponse,
  processCandidateBatch,
  type BatchProcessResult,
  type GroqParseResult,
} from '../_shared/groqSearch.ts'

const GROQ_TIMEOUT_MS = 100_000 // 100-second request deadline to prevent upstream proxy/Cloudflare 524 timeout

interface SearchContext {
  role: string
  skills: string[]
  location: string
  company: string
}

interface GroqExecutionResult {
  ok: boolean
  status: number
  content?: string
  error?: string
  code?: string
}

async function executeGroqBrowserSearch(
  apiKey: string,
  searchKeywords: string,
  ctx: SearchContext
): Promise<GroqExecutionResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, GROQ_TIMEOUT_MS)

  try {
    const systemPrompt = `You are an executive talent research assistant. You search the public internet EXCLUSIVELY for publicly indexed personal LinkedIn profiles matching the user's career search.
You have access to the browser_search tool. You MUST use it to search specifically for personal LinkedIn profiles.

CRITICAL SEARCH & VALIDATION INSTRUCTIONS:
1. TARGET PERSONAL LINKEDIN PROFILES: Search semantically for public personal LinkedIn member profiles using descriptive natural language terms (e.g. member profiles detailing work experience and professional headline). Do NOT rely on Google-specific search syntax like "site:" or boolean dorks, which degrade Exa search.
2. REJECT GITHUB & THIRD-PARTY LINKS: Never return GitHub profiles, Twitter/X profiles, personal portfolios, or company pages as the profile_url.
3. REJECT LINKEDIN COMPANY/DIRECTORY PAGES: Do NOT return linkedin.com/company/, linkedin.com/school/, or linkedin.com/jobs/.
4. AUTHENTIC RETRIEVED URLS ONLY: Every profile_url MUST be an authentic, publicly indexed personal LinkedIn profile URL starting with https://www.linkedin.com/in/, https://[subdomain].linkedin.com/in/, or /pub/.
5. NEVER GUESS OR CONSTRUCT A LINKEDIN URL: Do NOT construct a URL from a person's name (e.g. never invent https://www.linkedin.com/in/first-last). The URL must be explicitly present in the search evidence. If no genuine LinkedIn personal profile URL is retrieved, do not output that candidate.
6. EVIDENCE GROUNDING: Every candidate must have a verbatim snippet excerpt from the search result demonstrating their skills and current role.
7. OUTPUT FLEXIBILITY: You may format your output as a JSON array inside a \`\`\`json ... \`\`\` block, OR as structured Markdown bullet points listing each person with their full name, headline, current company, location, evidence snippet, and explicit LinkedIn profile URL.
8. If no eligible personal LinkedIn profiles are found with clear evidence, return an empty array: []

When outputting JSON, each object MUST have these keys:
- "full_name": string (real person's name)
- "headline": string (their professional title or summary from search result)
- "current_company": string (their employer if stated, or null)
- "location": string (their location if stated, or null)
- "profile_url": string (their authentic personal LinkedIn URL, e.g. https://www.linkedin.com/in/...)
- "source_url": string (the exact webpage or search result URL where this was found)
- "snippet": string (verifiable text excerpt from the search result demonstrating their skills/role)
- "evidence_summary": string (one sentence explaining what was confirmed from the search)
- "skills": array of strings (skills mentioned in the snippet)`

    const userMessage = [
      'Please search the public web semantically for publicly indexed personal LinkedIn profiles matching:',
      `Role: ${ctx.role}`,
      ctx.skills.length > 0 ? `Skills: ${ctx.skills.join(', ')}` : '',
      ctx.location ? `Location: ${ctx.location}` : '',
      ctx.company ? `Target Company: ${ctx.company}` : '',
      '',
      `Semantic Search Query: ${searchKeywords}`,
      '',
      'Find 3 to 6 genuine personal LinkedIn profiles. Every profile_url MUST be an authentic personal profile starting with https://...linkedin.com/in/ or /pub/ explicitly present in the search evidence.',
    ].filter(Boolean).join('\n')

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        tools: [{ type: 'browser_search' }],
        tool_choice: 'required',
        temperature: 0.1,
        max_completion_tokens: 3000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!groqRes.ok) {
      console.warn(`[groq-candidate-search] Upstream HTTP status: ${groqRes.status}`)
      const classified = classifyGroqError(groqRes.status)
      return {
        ok: false,
        status: classified.status,
        error: classified.message,
        code: classified.code,
      }
    }

    const groqData = await groqRes.json()
    const content = groqData.choices?.[0]?.message?.content || ''
    return { ok: true, status: 200, content }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`[groq-candidate-search] Local request timed out after ${GROQ_TIMEOUT_MS / 1000}s`)
      const classified = classifyGroqError(504, 'REQUEST_TIMEOUT')
      return {
        ok: false,
        status: classified.status,
        error: classified.message,
        code: classified.code,
      }
    }
    const message = err instanceof Error ? err.message : 'Unknown network failure'
    console.error('[groq-candidate-search] Network failure calling Groq:', message)
    const classified = classifyGroqError(502, 'NETWORK_ERROR')
    return {
      ok: false,
      status: classified.status,
      error: classified.message,
      code: classified.code,
    }
  } finally {
    clearTimeout(timer)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: valid Supabase session required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      console.error('[groq-candidate-search] Server configuration error: GROQ_API_KEY is not set')
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: GROQ_API_KEY secret is not configured in Supabase.',
          code: 'MISSING_GROQ_API_KEY',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const role = (body.role || 'AI/ML Engineer').trim()
    const skills: string[] = Array.isArray(body.skills) ? body.skills.filter(Boolean) : ['Python', 'PyTorch']
    const location = (body.location || '').trim()
    const company = (body.company || '').trim()
    const broader = Boolean(body.broader)

    const searchContext: SearchContext = { role, skills, location, company }

    // Run a single bounded search query (targeted by default, broader if requested)
    // Avoids running multiple synchronous browser searches per request to prevent timeouts
    const query = buildGroqNaturalLanguageQuery({
      role,
      skills,
      location,
      company,
      broader,
    })

    const searchResult = await executeGroqBrowserSearch(apiKey, query, searchContext)
    if (!searchResult.ok) {
      return new Response(
        JSON.stringify({
          error: searchResult.error || 'Groq search request failed',
          code: searchResult.code || 'SEARCH_FAILED',
        }),
        { status: searchResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const parseResult: GroqParseResult = parseGroqCandidateResponse(searchResult.content || '')
    const batchResult: BatchProcessResult = processCandidateBatch(parseResult.candidates)

    return new Response(
      JSON.stringify({
        success: true,
        candidates: batchResult.validatedCandidates,
        count: batchResult.validatedCandidates.length,
        queryUsed: query,
        isBroader: broader,
        diagnostics: {
          totalRawFound: parseResult.candidates.length,
          totalUrlsExtracted: batchResult.totalUrlsExtracted,
          validPersonalProfiles: batchResult.validatedCandidates.length,
          rejectedNonLinkedIn: batchResult.rejectionBreakdown.githubOrNonLinkedIn,
          companyOrDirectory: batchResult.rejectionBreakdown.companyOrDirectory,
          missingDirectUrls: batchResult.rejectionBreakdown.missingOrMalformedUrl,
          missingEvidence: batchResult.rejectionBreakdown.missingEvidence,
          invalidName: batchResult.rejectionBreakdown.invalidName,
          duplicatesFiltered: batchResult.duplicatesFiltered,
          format: parseResult.format,
          isBroader: broader,
          queryUsed: query,
        },
        rejectedCount: batchResult.rejectedCount,
        rejectionBreakdown: batchResult.rejectionBreakdown,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    console.error('[groq-candidate-search] Unhandled exception:', err)
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
