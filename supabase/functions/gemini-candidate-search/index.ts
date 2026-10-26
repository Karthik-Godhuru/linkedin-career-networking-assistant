import { corsHeaders } from '../_shared/cors.ts'
import { getAuthenticatedUser } from '../_shared/supabaseServer.ts'
import {
  buildGeminiSearchPrompt,
  classifyGeminiError,
  parseGeminiResponse,
  processCandidateBatch,
  sanitizeUrl,
  type BatchProcessResult,
  type GeminiParseResult,
} from '../_shared/geminiSearch.ts'

const GEMINI_TIMEOUT_MS = 60_000 // 60-second bounded deadline for Gemini search

interface SearchContext {
  role: string
  skills: string[]
  location: string
  company: string
  broader: boolean
}

interface GeminiExecutionResult {
  ok: boolean
  status: number
  data?: unknown
  error?: string
  code?: string
}

async function executeGeminiSearch(
  apiKey: string,
  model: string,
  prompt: string
): Promise<GeminiExecutionResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, GEMINI_TIMEOUT_MS)

  try {
    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: prompt,
        tools: [{ type: 'google_search' }],
      }),
    })

    if (!geminiRes.ok) {
      console.warn(`[gemini-candidate-search] Upstream HTTP status: ${geminiRes.status}`)
      let rawErrorText = ''
      try {
        const errorJson = await geminiRes.json()
        rawErrorText = errorJson?.error?.message || ''
      } catch {
        // Fall back to text if json fails
      }

      const classified = classifyGeminiError(geminiRes.status, undefined, rawErrorText)
      return {
        ok: false,
        status: classified.status,
        error: classified.message,
        code: classified.code,
      }
    }

    const geminiData = await geminiRes.json()
    return { ok: true, status: 200, data: geminiData }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`[gemini-candidate-search] Local request timed out after ${GEMINI_TIMEOUT_MS / 1000}s`)
      const classified = classifyGeminiError(504, 'REQUEST_TIMEOUT')
      return {
        ok: false,
        status: classified.status,
        error: classified.message,
        code: classified.code,
      }
    }
    const message = err instanceof Error ? err.message : 'Unknown network failure'
    console.error('[gemini-candidate-search] Network failure calling Gemini:', message)
    const classified = classifyGeminiError(502, 'NETWORK_ERROR')
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

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('[gemini-candidate-search] Server configuration error: GEMINI_API_KEY is not set')
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: GEMINI_API_KEY secret is not configured in Supabase.',
          code: 'MISSING_GEMINI_API_KEY',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash'

    const body = await req.json().catch(() => ({}))
    const role = (body.role || 'AI/ML Engineer').trim()
    const skills: string[] = Array.isArray(body.skills) ? body.skills.filter(Boolean) : ['Python', 'PyTorch']
    const location = (body.location || '').trim()
    const company = (body.company || '').trim()
    const broader = Boolean(body.broader)

    const searchContext: SearchContext = { role, skills, location, company, broader }
    const prompt = buildGeminiSearchPrompt(searchContext)

    const searchResult = await executeGeminiSearch(apiKey, model, prompt)
    if (!searchResult.ok) {
      return new Response(
        JSON.stringify({
          error: searchResult.error || 'Gemini search request failed',
          code: searchResult.code || 'SEARCH_FAILED',
        }),
        { status: searchResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const parseResult: GeminiParseResult = parseGeminiResponse(searchResult.data)

    // Build citation allow-list from retrieved Google Search grounding citations
    const citationAllowList = new Set<string>()
    for (const citation of parseResult.citations) {
      if (citation.url) {
        citationAllowList.add(sanitizeUrl(citation.url))
        citationAllowList.add(citation.url)
      }
    }

    const batchResult: BatchProcessResult = processCandidateBatch(parseResult.candidates, citationAllowList)

    return new Response(
      JSON.stringify({
        success: true,
        candidates: batchResult.validatedCandidates,
        count: batchResult.validatedCandidates.length,
        queryUsed: prompt,
        isBroader: broader,
        modelUsed: model,
        diagnostics: {
          totalRawFound: parseResult.candidates.length,
          totalUrlsExtracted: batchResult.totalUrlsExtracted,
          validPersonalProfiles: batchResult.validatedCandidates.length,
          rejectedNonLinkedIn: batchResult.rejectionBreakdown.githubOrNonLinkedIn,
          companyOrDirectory: batchResult.rejectionBreakdown.companyOrDirectory,
          missingDirectUrls: batchResult.rejectionBreakdown.missingOrMalformedUrl,
          missingEvidence: batchResult.rejectionBreakdown.missingEvidence,
          invalidName: batchResult.rejectionBreakdown.invalidName,
          notInCitationAllowList: batchResult.rejectionBreakdown.notInCitationAllowList,
          duplicatesFiltered: batchResult.duplicatesFiltered,
          citationsCount: parseResult.citations.length,
          format: parseResult.format,
          isBroader: broader,
          modelUsed: model,
        },
        rejectedCount: batchResult.rejectedCount,
        rejectionBreakdown: batchResult.rejectionBreakdown,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    console.error('[gemini-candidate-search] Unhandled exception:', err)
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
