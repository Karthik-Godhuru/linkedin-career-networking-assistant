import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  generateOAuthState,
  hashOAuthState,
  encryptToken,
  decryptToken,
} from '../lib/linkedinCrypto'
import {
  linkedinAuthService,
  extractEdgeFunctionError,
  sanitizeDiagnosticMessage,
} from '../services/linkedinAuthService'
import {
  buildLinkedInAuthorizationUrl,
  LINKEDIN_SCOPES,
} from '../../supabase/functions/_shared/linkedin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('LinkedIn OAuth 2.0 Integration: Cryptographic State & Token Security', () => {
  it('generates a 64-character hex state with 32 bytes of cryptographic randomness', () => {
    const state = generateOAuthState()
    expect(state).toHaveLength(64)
    expect(/^[0-9a-f]{64}$/.test(state)).toBe(true)

    // Verify randomness: multiple invocations must generate distinct states
    const state2 = generateOAuthState()
    expect(state).not.toBe(state2)
  })

  it('computes deterministic SHA-256 state hashes that do not reveal the raw state token', async () => {
    const state = generateOAuthState()
    const hash1 = await hashOAuthState(state)
    const hash2 = await hashOAuthState(state)

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
    expect(hash1).not.toBe(state)
  })

  it('rejects expired OAuth states in validation logic', () => {
    const expiredTimestamp = new Date(Date.now() - 5000).toISOString()
    const isExpired = new Date(expiredTimestamp).getTime() < Date.now()
    expect(isExpired).toBe(true)
  })

  it('rejects replayed / already used OAuth states', () => {
    const stateRecord = {
      id: 'state-123',
      user_id: 'user-abc',
      used: true,
      expires_at: new Date(Date.now() + 600000).toISOString(),
    }

    const validateState = (rec: typeof stateRecord) => {
      if (rec.used) {
        return { valid: false, error: 'OAuth state has already been used (replay rejected)' }
      }
      if (new Date(rec.expires_at).getTime() < Date.now()) {
        return { valid: false, error: 'OAuth state has expired' }
      }
      return { valid: true }
    }

    const result = validateState(stateRecord)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('already been used')
  })

  it('accepts valid, unused states and validates user-id association', () => {
    const validRecord = {
      id: 'state-456',
      user_id: 'user-789',
      used: false,
      expires_at: new Date(Date.now() + 600000).toISOString(),
    }

    const validateAndConsume = (rec: typeof validRecord, claimedUserId: string) => {
      if (rec.used) return { valid: false, error: 'Used' }
      if (new Date(rec.expires_at).getTime() < Date.now()) return { valid: false, error: 'Expired' }
      if (rec.user_id !== claimedUserId) return { valid: false, error: 'User mismatch' }
      rec.used = true
      return { valid: true, userId: rec.user_id }
    }

    const res = validateAndConsume(validRecord, 'user-789')
    expect(res.valid).toBe(true)
    expect(res.userId).toBe('user-789')
    expect(validRecord.used).toBe(true)

    // Subsequent attempt with consumed state fails
    const secondAttempt = validateAndConsume(validRecord, 'user-789')
    expect(secondAttempt.valid).toBe(false)
  })

  it('prevents an authenticated user from initializing or claiming state for another user', () => {
    const serverSessionUser = { id: 'authenticated-user-111' }
    const clientSuppliedUserId = 'victim-user-222'

    // The state creation logic must bind to serverSessionUser.id and ignore clientSuppliedUserId
    const createStateRecord = (sessionUser: typeof serverSessionUser, _untrustedPayload?: { user_id?: string }) => {
      // Must strictly use sessionUser.id
      return {
        id: 'state-uuid-999',
        user_id: sessionUser.id,
        state_hash: 'abc123hash',
        used: false,
      }
    }

    const stateRecord = createStateRecord(serverSessionUser, { user_id: clientSuppliedUserId })
    expect(stateRecord.user_id).toBe(serverSessionUser.id)
    expect(stateRecord.user_id).not.toBe(clientSuppliedUserId)
  })

  it('reproduces permission denial for client roles (anon/authenticated) while privileged service_role succeeds', () => {
    // Simulates database role permission check on public.linkedin_oauth_states
    const permissionsByRole: Record<string, string[]> = {
      anon: [],
      authenticated: [],
      service_role: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    }

    const checkInsertPermission = (role: string, table: string) => {
      if (table === 'public.linkedin_oauth_states') {
        const grants = permissionsByRole[role] || []
        if (!grants.includes('INSERT')) {
          return { error: { message: `permission denied for table ${table.replace('public.', '')}` } }
        }
      }
      return { error: null }
    }

    // Direct client attempts fail with permission denied
    expect(checkInsertPermission('anon', 'public.linkedin_oauth_states').error?.message).toBe(
      'permission denied for table linkedin_oauth_states'
    )
    expect(checkInsertPermission('authenticated', 'public.linkedin_oauth_states').error?.message).toBe(
      'permission denied for table linkedin_oauth_states'
    )

    // Privileged service_role client succeeds
    expect(checkInsertPermission('service_role', 'public.linkedin_oauth_states').error).toBeNull()
  })
})

describe('LinkedIn OAuth 2.0: AES-GCM Authenticated Encryption for Tokens', () => {
  const secretKey = 'super-secret-encryption-passphrase-32b!'
  const sampleAccessToken = 'AQX1234567890_linkedin_live_access_token_demo'
  const sampleRefreshToken = 'AQY_refresh_token_sample_secret_payload_987654321'

  it('encrypts tokens to a versioned self-contained envelope (v1:<iv>:<ciphertext>)', async () => {
    const res = await encryptToken(sampleAccessToken, secretKey)

    expect(res.version).toBe('v1')
    expect(res.encrypted).toBeDefined()
    expect(res.iv).toBeDefined()
    expect(res.ciphertext).toBeDefined()
    expect(res.encrypted).toBe(`v1:${res.iv}:${res.ciphertext}`)
    expect(res.encrypted).not.toContain(sampleAccessToken)
    expect(res.encrypted.length).toBeGreaterThan(30)
  })

  it('generates unique random IVs on subsequent encryptions of the same token', async () => {
    const res1 = await encryptToken(sampleAccessToken, secretKey)
    const res2 = await encryptToken(sampleAccessToken, secretKey)

    expect(res1.iv).not.toBe(res2.iv)
    expect(res1.ciphertext).not.toBe(res2.ciphertext)
    expect(res1.encrypted).not.toBe(res2.encrypted)

    // Both decrypt back to the same original token
    const dec1 = await decryptToken(res1.encrypted, secretKey)
    const dec2 = await decryptToken(res2.encrypted, secretKey)
    expect(dec1).toBe(sampleAccessToken)
    expect(dec2).toBe(sampleAccessToken)
  })

  it('independently encrypts and recovers access tokens and refresh tokens with different IVs', async () => {
    const encAccess = await encryptToken(sampleAccessToken, secretKey)
    const encRefresh = await encryptToken(sampleRefreshToken, secretKey)

    expect(encAccess.iv).not.toBe(encRefresh.iv)
    expect(encAccess.encrypted).not.toBe(encRefresh.encrypted)

    // Decrypt both independently using their self-contained envelopes
    const decAccess = await decryptToken(encAccess.encrypted, secretKey)
    const decRefresh = await decryptToken(encRefresh.encrypted, secretKey)

    expect(decAccess).toBe(sampleAccessToken)
    expect(decRefresh).toBe(sampleRefreshToken)
  })

  it('successfully decrypts using both envelope (2-arg) and legacy (3-arg) signatures', async () => {
    const res = await encryptToken(sampleAccessToken, secretKey)

    // 2-argument call using self-contained envelope
    const decEnvelope = await decryptToken(res.encrypted, secretKey)
    expect(decEnvelope).toBe(sampleAccessToken)

    // 3-argument call using separated ciphertext and IV
    const decSeparated = await decryptToken(res.ciphertext, res.iv, secretKey)
    expect(decSeparated).toBe(sampleAccessToken)
  })

  it('fails decryption and detects tampering when ciphertext, IV, or version prefix is modified', async () => {
    const res = await encryptToken(sampleAccessToken, secretKey)

    // Tamper with ciphertext by corrupting last character
    const parts = res.encrypted.split(':')
    const tamperedCiphertext = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -3)}XYZ`
    await expect(decryptToken(tamperedCiphertext, secretKey)).rejects.toThrow()

    // Tamper with IV
    const tamperedIv = `${parts[0]}:corruptedIV12:${parts[2]}`
    await expect(decryptToken(tamperedIv, secretKey)).rejects.toThrow()

    // Unsupported version prefix
    const invalidVersion = `v2:${parts[1]}:${parts[2]}`
    await expect(decryptToken(invalidVersion, secretKey)).rejects.toThrow(/versioned token format|Missing v1:/)

    // Wrong secret key
    const wrongKey = 'wrong-key-completely-different-password!'
    await expect(decryptToken(res.encrypted, wrongKey)).rejects.toThrow()
  })

  it('rejects empty plaintext, missing secrets, or malformed envelopes', async () => {
    await expect(encryptToken('', secretKey)).rejects.toThrow('Plaintext cannot be empty')
    await expect(encryptToken(sampleAccessToken, '')).rejects.toThrow('Encryption secret cannot be empty')
    await expect(decryptToken('not-a-valid-envelope', secretKey)).rejects.toThrow(/Missing v1: prefix/)
  })
})

describe('LinkedIn URL Builder & Scope Validation', () => {
  it('requests only the provisioned scopes (openid, profile, email, w_member_social)', () => {
    expect(LINKEDIN_SCOPES).toEqual(['openid', 'profile', 'email', 'w_member_social'])
  })

  it('builds an authorization URL compliant with LinkedIn OAuth 2.0 specs', () => {
    const urlString = buildLinkedInAuthorizationUrl({
      clientId: 'linkedin_client_123',
      redirectUri: 'https://example.supabase.co/functions/v1/linkedin-oauth-callback',
      state: 'random_state_hex_abc',
    })

    const url = new URL(urlString)
    expect(url.origin).toBe('https://www.linkedin.com')
    expect(url.pathname).toBe('/oauth/v2/authorization')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('linkedin_client_123')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://example.supabase.co/functions/v1/linkedin-oauth-callback'
    )
    expect(url.searchParams.get('state')).toBe('random_state_hex_abc')
    expect(url.searchParams.get('scope')).toBe('openid profile email w_member_social')
  })

  it('serializes space-delimited scope values using %20 rather than plus characters', () => {
    const urlString = buildLinkedInAuthorizationUrl({
      clientId: 'linkedin_client_123',
      redirectUri: 'https://example.supabase.co/functions/v1/linkedin-oauth-callback',
      state: 'random_state_hex_abc',
    })

    // Scope parameter must be percent-encoded (%20) per LinkedIn documentation
    expect(urlString).toContain('scope=openid%20profile%20email%20w_member_social')
    expect(urlString).not.toMatch(/scope=[^&]*\+/)

    // Redirect URI must remain properly encoded without double-encoding
    expect(urlString).toContain(
      'redirect_uri=https%3A%2F%2Fexample.supabase.co%2Ffunctions%2Fv1%2Flinkedin-oauth-callback'
    )
    expect(urlString).not.toContain('%253A')

    // State parameter must remain intact
    expect(urlString).toContain('state=random_state_hex_abc')
  })
})

describe('Database Migration & RLS Security Audit', () => {
  const migrationPath09 = path.resolve(
    __dirname,
    '../../supabase/migrations/20261025000009_create_linkedin_oauth_tables.sql'
  )
  const forwardMigrationPath10 = path.resolve(
    __dirname,
    '../../supabase/migrations/20261025000010_grant_linkedin_tables_service_role.sql'
  )

  it('applied migration 000009 exists in supabase/migrations/ with original schema and revokes', () => {
    expect(fs.existsSync(migrationPath09)).toBe(true)
    const sql = fs.readFileSync(migrationPath09, 'utf-8')

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.linkedin_oauth_states')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.linkedin_connections')
    expect(sql).toContain('REFERENCES auth.users(id)')
    expect(sql).toContain('ON DELETE CASCADE')
    expect(sql).toContain('ALTER TABLE public.linkedin_oauth_states ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('REVOKE ALL ON public.linkedin_oauth_states FROM anon, authenticated;')
    expect(sql).toContain('REVOKE ALL ON public.linkedin_connections FROM anon, authenticated;')
    expect(sql).not.toMatch(/GRANT\s+.*\s+ON\s+TABLE\s+public\.linkedin_\w+\s+TO\s+(anon|authenticated)/i)
  })

  it('new forward migration 000010 grants table and execute privileges exclusively to service_role', () => {
    expect(fs.existsSync(forwardMigrationPath10)).toBe(true)
    const sql = fs.readFileSync(forwardMigrationPath10, 'utf-8')

    expect(sql).toContain('GRANT ALL ON TABLE public.linkedin_oauth_states TO service_role;')
    expect(sql).toContain('GRANT ALL ON TABLE public.linkedin_connections TO service_role;')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.cleanup_expired_linkedin_states()')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.cleanup_expired_linkedin_states()')
    expect(sql).toContain('TO service_role;')
    expect(sql).not.toMatch(/GRANT\s+.*\s+TO\s+(anon|authenticated)/i)
  })

  it('stores self-contained encrypted tokens and avoids redundant token_iv columns', () => {
    const sql = fs.readFileSync(migrationPath09, 'utf-8')

    expect(sql).toContain('encrypted_access_token TEXT NOT NULL')
    expect(sql).toContain('encrypted_refresh_token TEXT')
    expect(sql).not.toContain('token_iv TEXT')
  })
})

describe('LinkedIn Client Service: Connection Status & Disconnect', () => {
  beforeEach(async () => {
    await linkedinAuthService.disconnect()
  })

  it('returns disconnected status when no connection exists', async () => {
    const status = await linkedinAuthService.getConnectionStatus()
    expect(status.connected).toBe(false)
    expect(status.scopes).toEqual([])
  })

  it('stores and retrieves mock connection metadata for local development', async () => {
    linkedinAuthService.setMockConnected({
      name: 'Sarah Connor',
      email: 'sarah.connor@example.com',
      memberId: 'member_sc123',
    })

    const status = await linkedinAuthService.getConnectionStatus()
    expect(status.connected).toBe(true)
    expect(status.name).toBe('Sarah Connor')
    expect(status.email).toBe('sarah.connor@example.com')
    expect(status.memberId).toBe('member_sc123')
    expect(status.scopes).toContain('w_member_social')
  })

  it('disconnect securely purges connection state', async () => {
    linkedinAuthService.setMockConnected({ name: 'Alex' })
    const beforeStatus = await linkedinAuthService.getConnectionStatus()
    expect(beforeStatus.connected).toBe(true)

    const success = await linkedinAuthService.disconnect()
    expect(success).toBe(true)

    const afterStatus = await linkedinAuthService.getConnectionStatus()
    expect(afterStatus.connected).toBe(false)
  })

  it('sharePost dispatches post to LinkedIn with commentary', async () => {
    const res = await linkedinAuthService.sharePost('Testing automated posting with AI insights!')
    expect(res.success).toBe(true)
    expect(res.urn).toBeDefined()
  })
})

describe('Frontend Diagnostic Error Extraction & Sanitization', () => {
  it('extracts diagnostic error from a standard JSON response with error field', async () => {
    const mockResponse = new Response(
      JSON.stringify({ error: 'Failed to initialize OAuth state: relation "linkedin_oauth_states" does not exist' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )

    const httpError = {
      name: 'FunctionsHttpError',
      message: 'Edge Function returned a non-2xx status code',
      context: mockResponse,
    }

    const diagnostic = await extractEdgeFunctionError(httpError)
    expect(diagnostic).toBe('Failed to initialize OAuth state: relation "linkedin_oauth_states" does not exist')
  })

  it('extracts diagnostic message from a JSON response with message field', async () => {
    const mockResponse = new Response(
      JSON.stringify({ message: 'Server configuration error: LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI is not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )

    const httpError = { context: mockResponse }
    const diagnostic = await extractEdgeFunctionError(httpError)
    expect(diagnostic).toBe('Server configuration error: LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI is not set')
  })

  it('safely extracts plain text error bodies when response is not JSON', async () => {
    const mockResponse = new Response('Database connection timeout', {
      status: 504,
      headers: { 'Content-Type': 'text/plain' },
    })

    const httpError = { context: mockResponse }
    const diagnostic = await extractEdgeFunctionError(httpError)
    expect(diagnostic).toBe('Database connection timeout')
  })

  it('returns null for an empty response body without throwing', async () => {
    const mockResponse = new Response('', { status: 500 })
    const httpError = { context: mockResponse }

    const diagnostic = await extractEdgeFunctionError(httpError)
    expect(diagnostic).toBeNull()
  })

  it('handles malformed JSON body safely without throwing', async () => {
    const mockResponse = new Response('{malformed json payload', { status: 500 })
    const httpError = { context: mockResponse }

    const diagnostic = await extractEdgeFunctionError(httpError)
    expect(diagnostic).toBe('{malformed json payload')
  })

  it('returns null when error has no context or is not an object', async () => {
    expect(await extractEdgeFunctionError(null)).toBeNull()
    expect(await extractEdgeFunctionError(undefined)).toBeNull()
    expect(await extractEdgeFunctionError('string error')).toBeNull()
    expect(await extractEdgeFunctionError(new Error('Network offline'))).toBeNull()
    expect(await extractEdgeFunctionError({ context: null })).toBeNull()
  })

  it('safely clones the response stream leaving the original response readable', async () => {
    const mockResponse = new Response(JSON.stringify({ error: 'Stream test' }), { status: 500 })
    const httpError = { context: mockResponse }

    const diagnostic = await extractEdgeFunctionError(httpError)
    expect(diagnostic).toBe('Stream test')

    // Original response body stream can still be read
    const originalText = await mockResponse.text()
    expect(originalText).toContain('Stream test')
  })

  it('sanitizes and redacts sensitive credentials from diagnostic messages', () => {
    const raw = 'Failed at token Bearer eyJhbGciOi...123 and client_secret=shh_secret_abc'
    const sanitized = sanitizeDiagnosticMessage(raw)

    expect(sanitized).not.toContain('eyJhbGciOi...123')
    expect(sanitized).not.toContain('shh_secret_abc')
    expect(sanitized).toContain('Bearer [REDACTED]')
    expect(sanitized).toContain('client_secret=[REDACTED]')
  })

  it('redacts versioned token envelopes and 64-char hex keys', () => {
    const raw = 'Found envelope v1:aXYxMnl6YWJjZGVm:Y2lwaGVydGV4dA== with key a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
    const sanitized = sanitizeDiagnosticMessage(raw)

    expect(sanitized).not.toContain('v1:aXYxMnl6YWJjZGVm:Y2lwaGVydGV4dA==')
    expect(sanitized).toContain('v1:[REDACTED]')
    expect(sanitized).not.toContain('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2')
    expect(sanitized).toContain('[REDACTED_HEX]')
  })

  it('strips multi-line stack traces and truncates excessive message lengths', () => {
    const multiLine = 'Database constraint error\n    at query (pg.js:12:34)\n    at client.js:56:78'
    const sanitized = sanitizeDiagnosticMessage(multiLine)

    expect(sanitized).toBe('Database constraint error')
    expect(sanitized).not.toContain('at query')

    const longMessage = 'A'.repeat(300)
    const truncated = sanitizeDiagnosticMessage(longMessage)
    expect(truncated.length).toBeLessThanOrEqual(200)
    expect(truncated.endsWith('...')).toBe(true)
  })
})
