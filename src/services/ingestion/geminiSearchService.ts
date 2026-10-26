import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import type {
  GeminiDiscoveredCandidate,
  GeminiRejectionBreakdown,
  GeminiDiagnostics,
} from '../../types/candidate'

export interface GeminiSearchParams {
  role?: string
  skills?: string[]
  location?: string
  company?: string
  broader?: boolean
}

export interface GeminiSearchResponse {
  success: boolean
  candidates: GeminiDiscoveredCandidate[]
  count: number
  queryUsed?: string
  isBroader?: boolean
  modelUsed?: string
  rejectedCount?: number
  rejectionBreakdown?: GeminiRejectionBreakdown
  diagnostics?: GeminiDiagnostics
  error?: string
  code?: string
}

export async function searchCandidatesWithGemini(
  params: GeminiSearchParams
): Promise<GeminiSearchResponse> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      candidates: [],
      count: 0,
      error: 'Supabase client is not configured. Connect your Supabase project to use AI search.',
      code: 'SUPABASE_NOT_CONFIGURED',
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('gemini-candidate-search', {
      body: params,
    })

    if (error) {
      let detailMsg = error.message || 'Edge function error'
      let errorCode = 'EDGE_FUNCTION_ERROR'

      // Check for response body in error.context
      const context = (error as unknown as { context?: Response }).context
      if (context && typeof context.json === 'function') {
        try {
          const clone = context.clone()
          const parsed = await clone.json()
          if (parsed?.error) detailMsg = parsed.error
          if (parsed?.code) errorCode = parsed.code
        } catch {
          // Fall back to message
        }
      }

      return {
        success: false,
        candidates: [],
        count: 0,
        error: detailMsg,
        code: errorCode,
      }
    }

    if (!data || !Array.isArray(data.candidates)) {
      return {
        success: true,
        candidates: [],
        count: 0,
        queryUsed: data?.queryUsed,
        isBroader: data?.isBroader ?? Boolean(params.broader),
        modelUsed: data?.modelUsed,
        rejectedCount: data?.rejectedCount ?? 0,
        rejectionBreakdown: data?.rejectionBreakdown,
        diagnostics: data?.diagnostics,
      }
    }

    return {
      success: true,
      candidates: data.candidates as GeminiDiscoveredCandidate[],
      count: data.count ?? data.candidates.length,
      queryUsed: data.queryUsed,
      isBroader: data.isBroader ?? Boolean(params.broader),
      modelUsed: data.modelUsed,
      rejectedCount: data.rejectedCount ?? 0,
      rejectionBreakdown: data.rejectionBreakdown,
      diagnostics: data.diagnostics,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown network failure during search'
    return {
      success: false,
      candidates: [],
      count: 0,
      error: msg,
      code: 'NETWORK_ERROR',
    }
  }
}
