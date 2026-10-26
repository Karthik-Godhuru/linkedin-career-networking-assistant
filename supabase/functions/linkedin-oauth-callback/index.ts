import { encryptToken, hashOAuthState } from '../_shared/crypto.ts'
import {
  exchangeAuthorizationCode,
  fetchLinkedInUserInfo,
} from '../_shared/linkedin.ts'
import { getAdminClient } from '../_shared/supabaseServer.ts'

function safeRedirect(targetBase: string, params: Record<string, string>): Response {
  let redirectUrl: URL
  try {
    redirectUrl = new URL(targetBase)
  } catch {
    redirectUrl = new URL('http://localhost:5173')
  }

  for (const [k, v] of Object.entries(params)) {
    redirectUrl.searchParams.set(k, v)
  }

  return Response.redirect(redirectUrl.toString(), 302)
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'

  const errorParam = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')
  if (errorParam) {
    return safeRedirect(appBaseUrl, {
      linkedin: 'error',
      message: errorDescription || errorParam || 'User canceled authorization',
    })
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return safeRedirect(appBaseUrl, {
      linkedin: 'error',
      message: 'Missing code or state in authorization callback',
    })
  }

  try {
    const admin = getAdminClient()
    const stateHash = await hashOAuthState(state)

    // Lookup state record
    const { data: stateRecord, error: stateQueryError } = await admin
      .from('linkedin_oauth_states')
      .select('id, user_id, expires_at, used')
      .eq('state_hash', stateHash)
      .maybeSingle()

    if (stateQueryError || !stateRecord) {
      return safeRedirect(appBaseUrl, {
        linkedin: 'error',
        message: 'Invalid or unknown OAuth state',
      })
    }

    if (stateRecord.used) {
      return safeRedirect(appBaseUrl, {
        linkedin: 'error',
        message: 'OAuth state has already been used (replay rejected)',
      })
    }

    const isExpired = new Date(stateRecord.expires_at).getTime() < Date.now()
    if (isExpired) {
      return safeRedirect(appBaseUrl, {
        linkedin: 'error',
        message: 'OAuth state has expired. Please initiate connection again.',
      })
    }

    // Mark state as consumed immediately
    await admin
      .from('linkedin_oauth_states')
      .update({ used: true })
      .eq('id', stateRecord.id)

    // Read LinkedIn credentials
    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')
    const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET')
    const redirectUri = Deno.env.get('LINKEDIN_REDIRECT_URI')
    const encryptionKey = Deno.env.get('LINKEDIN_TOKEN_ENCRYPTION_KEY')

    if (!clientId || !clientSecret || !redirectUri || !encryptionKey) {
      return safeRedirect(appBaseUrl, {
        linkedin: 'error',
        message: 'Server configuration error: missing LinkedIn credentials or encryption key',
      })
    }

    // Exchange code for token
    const tokenData = await exchangeAuthorizationCode({
      clientId,
      clientSecret,
      redirectUri,
      code,
    })

    // Fetch user profile info
    const userInfo = await fetchLinkedInUserInfo(tokenData.access_token)

    // Encrypt tokens using AES-GCM (self-contained versioned envelopes v1:<iv>:<ciphertext>)
    const encAccessToken = await encryptToken(
      tokenData.access_token,
      encryptionKey
    )

    let encRefreshToken: string | null = null
    if (tokenData.refresh_token) {
      const resRefresh = await encryptToken(tokenData.refresh_token, encryptionKey)
      encRefreshToken = resRefresh.encrypted
    }

    const accessTokenExpiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null

    const refreshTokenExpiresAt = tokenData.refresh_token_expires_in
      ? new Date(Date.now() + tokenData.refresh_token_expires_in * 1000).toISOString()
      : null

    const scopes = tokenData.scope ? tokenData.scope.split(/[\s,]+/) : ['openid', 'profile', 'email', 'w_member_social']

    // Upsert into linkedin_connections bound to stateRecord.user_id
    const { error: upsertError } = await admin
      .from('linkedin_connections')
      .upsert(
        {
          user_id: stateRecord.user_id,
          linkedin_member_id: userInfo.sub,
          encrypted_access_token: encAccessToken.encrypted,
          encrypted_refresh_token: encRefreshToken,
          access_token_expires_at: accessTokenExpiresAt,
          refresh_token_expires_at: refreshTokenExpiresAt,
          scopes,
          name: userInfo.name || null,
          email: userInfo.email || null,
          picture_url: userInfo.picture || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      return safeRedirect(appBaseUrl, {
        linkedin: 'error',
        message: `Failed to save LinkedIn connection: ${upsertError.message}`,
      })
    }

    return safeRedirect(appBaseUrl, {
      linkedin: 'connected',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OAuth processing failed'
    return safeRedirect(appBaseUrl, {
      linkedin: 'error',
      message,
    })
  }
})
