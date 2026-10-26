import { corsHeaders } from '../_shared/cors.ts'
import { decryptToken } from '../_shared/crypto.ts'
import { publishLinkedInPost } from '../_shared/linkedin.ts'
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

    const body = await req.json()
    const text = body?.text
    const postId = body?.postId

    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Response(
        JSON.stringify({ error: 'Post text commentary is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const admin = getAdminClient()
    const { data: connection, error: connError } = await admin
      .from('linkedin_connections')
      .select('linkedin_member_id, encrypted_access_token, access_token_expires_at, scopes')
      .eq('user_id', user.id)
      .maybeSingle()

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No active LinkedIn connection found for this user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (
      connection.access_token_expires_at &&
      new Date(connection.access_token_expires_at).getTime() < Date.now()
    ) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn access token has expired. Please reconnect your account.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const encryptionKey = Deno.env.get('LINKEDIN_TOKEN_ENCRYPTION_KEY')
    if (!encryptionKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing token encryption key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const decryptedAccessToken = await decryptToken(
      connection.encrypted_access_token,
      encryptionKey
    )

    const publishResult = await publishLinkedInPost({
      accessToken: decryptedAccessToken,
      authorUrn: connection.linkedin_member_id,
      commentary: text.trim(),
    })

    if (!publishResult.success) {
      return new Response(
        JSON.stringify({ error: publishResult.error || 'Failed to publish post to LinkedIn' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If a draft post ID was provided, mark it as published in content_recommendations
    if (postId) {
      await admin
        .from('content_recommendations')
        .update({
          draft_status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .eq('user_id', user.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        urn: publishResult.postId,
        message: 'Post successfully published to LinkedIn',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
