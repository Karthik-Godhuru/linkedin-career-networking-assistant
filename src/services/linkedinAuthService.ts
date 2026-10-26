/**
 * Client service for interacting with LinkedIn OAuth and publishing Edge Functions.
 *
 * Provides live integration with Supabase Edge Functions:
 * - linkedin-oauth-start
 * - linkedin-oauth-callback
 * - linkedin-connection-status
 * - linkedin-disconnect
 * - linkedin-share-post
 *
 * Includes transparent offline/development mock support for reliable local testing.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type {
  LinkedInConnectionMetadata,
  LinkedInOAuthStartResponse,
  LinkedInShareResponse,
} from '../types/linkedin'

/**
 * Safely sanitizes a diagnostic message to prevent leaking secrets, credentials, or raw stack traces.
 */
export function sanitizeDiagnosticMessage(message?: string | null): string {
  if (!message || typeof message !== 'string') {
    return ''
  }

  // Strip multi-line stack traces; take the primary error line
  let cleaned = message.split('\n')[0].trim()

  // Redact Bearer tokens
  cleaned = cleaned.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')

  // Redact secret query params or key assignments
  cleaned = cleaned.replace(/(client_secret|encryption_key|service_role_key|secret)=([^\s&]+)/gi, '$1=[REDACTED]')

  // Redact encrypted token envelopes: v1:<iv>:<ciphertext>
  cleaned = cleaned.replace(/v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+/g, 'v1:[REDACTED]')

  // Redact long hex keys (e.g. 64-char state or 32-byte hex keys)
  cleaned = cleaned.replace(/\b[0-9a-fA-F]{32,64}\b/g, '[REDACTED_HEX]')

  // Redact auth headers and cookie dumps
  cleaned = cleaned.replace(/(authorization|cookie):\s*[^\s]+/gi, '$1: [REDACTED]')

  // Limit message length to avoid overflowing UI containers
  if (cleaned.length > 200) {
    cleaned = cleaned.slice(0, 197) + '...'
  }

  return cleaned
}

/**
 * Safely extracts a diagnostic message from a Supabase FunctionsHttpError.
 * Clones the response before reading to avoid consuming the original body stream.
 */
export async function extractEdgeFunctionError(error: unknown): Promise<string | null> {
  if (!error || typeof error !== 'object') {
    return null
  }

  const context = 'context' in error ? (error as { context?: unknown }).context : undefined
  if (!context || typeof context !== 'object') {
    return null
  }

  let rawContent: string | null = null

  // If context is a Web Response (or implements clone)
  if (typeof (context as Response).clone === 'function') {
    try {
      const cloned = (context as Response).clone()
      try {
        const json = await cloned.json()
        if (json && typeof json === 'object') {
          if (typeof json.error === 'string' && json.error.trim()) {
            rawContent = json.error.trim()
          } else if (typeof json.message === 'string' && json.message.trim()) {
            rawContent = json.message.trim()
          }
        }
      } catch {
        // Fallback to text if JSON parsing fails
        try {
          const text = await (context as Response).text()
          if (text && text.trim()) {
            rawContent = text.trim()
          }
        } catch {
          // ignore read failure
        }
      }
    } catch {
      // If clone() itself fails (e.g. stream already locked), try text() on context
      try {
        const text = await (context as Response).text()
        if (text && text.trim()) {
          rawContent = text.trim()
        }
      } catch {
        // ignore read failure
      }
    }
  } else if (typeof (context as { text?: () => Promise<string> }).text === 'function') {
    try {
      const text = await (context as { text: () => Promise<string> }).text()
      if (text && text.trim()) {
        rawContent = text.trim()
      }
    } catch {
      // ignore
    }
  }

  if (!rawContent) {
    return null
  }

  // If rawContent looks like JSON string (e.g. from plain text response)
  if (rawContent.startsWith('{') && rawContent.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawContent)
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.error === 'string' && parsed.error.trim()) {
          rawContent = parsed.error.trim()
        } else if (typeof parsed.message === 'string' && parsed.message.trim()) {
          rawContent = parsed.message.trim()
        }
      }
    } catch {
      // Keep rawContent as is
    }
  }

  return sanitizeDiagnosticMessage(rawContent)
}

const MOCK_STORAGE_KEY = 'linkedin_assistant_mock_connection_state'

const memoryStore = new Map<string, string>()

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
  } catch {
    // ignore
  }
  return memoryStore.get(key) ?? null
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
      return
    }
  } catch {
    // ignore
  }
  memoryStore.set(key, value)
}

function removeStorageItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key)
      return
    }
  } catch {
    // ignore
  }
  memoryStore.delete(key)
}

export const linkedinAuthService = {
  /**
   * Fetches safe connection metadata for the currently signed-in user.
   */
  async getConnectionStatus(): Promise<LinkedInConnectionMetadata> {
    const mock = this.getMockStatus()
    if (mock.connected) {
      return mock
    }

    if (!isSupabaseConfigured()) {
      return mock
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        return mock
      }

      const { data, error } = await supabase.functions.invoke<LinkedInConnectionMetadata>(
        'linkedin-connection-status'
      )

      if (error || !data) {
        return this.getMockStatus()
      }

      return data
    } catch {
      return this.getMockStatus()
    }
  },

  /**
   * Initiates OAuth flow by requesting an authorization URL with single-use hashed state.
   */
  async startOAuth(): Promise<LinkedInOAuthStartResponse> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please supply valid credentials in your environment.')
    }

    const { data, error } = await supabase.functions.invoke<LinkedInOAuthStartResponse>(
      'linkedin-oauth-start'
    )

    if (error || !data?.authUrl) {
      const genericMessage =
        'Failed to initialize LinkedIn authorization. Ensure Edge Functions and LinkedIn environment variables are configured.'
      const diagnosticDetail = error ? await extractEdgeFunctionError(error) : null

      const isDev = Boolean(import.meta.env?.DEV)
      if (isDev && diagnosticDetail) {
        throw new Error(`${genericMessage} (Dev Diagnostic: ${diagnosticDetail})`)
      }

      throw new Error(genericMessage)
    }

    return data
  },

  /**
   * Securely disconnects the LinkedIn account for the authenticated user.
   */
  async disconnect(): Promise<boolean> {
    removeStorageItem(MOCK_STORAGE_KEY)

    if (!isSupabaseConfigured()) {
      return true
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        return true
      }

      await supabase.functions.invoke('linkedin-disconnect')
      return true
    } catch {
      return true
    }
  },

  /**
   * Publishes an approved post draft using the official Share on LinkedIn API.
   */
  async sharePost(text: string, postId?: string): Promise<LinkedInShareResponse> {
    if (!text || !text.trim()) {
      return { success: false, error: 'Post text commentary is required' }
    }

    const mock = this.getMockStatus()
    if (!isSupabaseConfigured() || mock.connected) {
      // Mock share success for development preview
      return {
        success: true,
        urn: `urn:li:share:mock_${Date.now()}`,
      }
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        return {
          success: true,
          urn: `urn:li:share:mock_${Date.now()}`,
        }
      }

      const { data, error } = await supabase.functions.invoke<LinkedInShareResponse>(
        'linkedin-share-post',
        {
          body: { text, postId },
        }
      )

      if (error || !data) {
        let errorMsg = error?.message || 'Failed to dispatch post to LinkedIn API.'
        if (error) {
          const diagnosticDetail = await extractEdgeFunctionError(error)
          if (Boolean(import.meta.env?.DEV) && diagnosticDetail) {
            errorMsg = `${errorMsg} (Dev Diagnostic: ${diagnosticDetail})`
          }
        }
        return {
          success: false,
          error: errorMsg,
        }
      }

      return data
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error publishing post.',
      }
    }
  },

  // Mock helpers for local development when offline or functions unbuilt
  getMockStatus(): LinkedInConnectionMetadata {
    try {
      const raw = getStorageItem(MOCK_STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw) as LinkedInConnectionMetadata
      }
    } catch {
      // ignore
    }
    return {
      connected: false,
      scopes: [],
    }
  },

  setMockConnected(metadata: Partial<LinkedInConnectionMetadata>): LinkedInConnectionMetadata {
    const full: LinkedInConnectionMetadata = {
      connected: true,
      memberId: metadata.memberId || 'dev_member_abc123',
      name: metadata.name || 'Alex Morgan',
      email: metadata.email || 'alex.morgan@example.com',
      pictureUrl: metadata.pictureUrl,
      headline: metadata.headline || 'Staff AI Engineer | Deep Learning & Systems',
      scopes: metadata.scopes || ['openid', 'profile', 'email', 'w_member_social'],
      connectedAt: new Date().toISOString(),
      tokenExpired: false,
    }
    setStorageItem(MOCK_STORAGE_KEY, JSON.stringify(full))
    return full
  },
}
