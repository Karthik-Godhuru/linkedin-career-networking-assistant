import { corsHeaders } from '../_shared/cors.ts'
import { generateOAuthState, hashOAuthState } from '../_shared/crypto.ts'
import { buildLinkedInAuthorizationUrl } from '../_shared/linkedin.ts'
import { getAdminClient, getAuthenticatedUser } from '../_shared/supabaseServer.ts'

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

    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')
    const redirectUri = Deno.env.get('LINKEDIN_REDIRECT_URI')

    if (!clientId || !redirectUri) {
      console.error('[linkedin-oauth-start] Server configuration error: LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI is not set')
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI is not set',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const state = generateOAuthState()
    const stateHash = await hashOAuthState(state)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const admin = getAdminClient()
    const { error: insertError } = await admin.from('linkedin_oauth_states').insert({
      user_id: user.id,
      state_hash: stateHash,
      expires_at: expiresAt,
      used: false,
    })

    if (insertError) {
      console.error('[linkedin-oauth-start] Failed to initialize OAuth state:', insertError.message)
      return new Response(
        JSON.stringify({ error: `Failed to initialize OAuth state: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authUrl = buildLinkedInAuthorizationUrl({
      clientId,
      redirectUri,
      state,
    })

    return new Response(
      JSON.stringify({
        authUrl,
        state,
        expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    console.error('[linkedin-oauth-start] Unhandled exception:', err)
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
