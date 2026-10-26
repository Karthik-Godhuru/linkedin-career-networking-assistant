import { corsHeaders } from '../_shared/cors.ts'
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

    const admin = getAdminClient()
    const { data: connection, error } = await admin
      .from('linkedin_connections')
      .select('linkedin_member_id, name, email, picture_url, headline, scopes, access_token_expires_at, created_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return new Response(
        JSON.stringify({ error: `Database query failed: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!connection) {
      return new Response(
        JSON.stringify({
          connected: false,
          scopes: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isExpired = connection.access_token_expires_at
      ? new Date(connection.access_token_expires_at).getTime() < Date.now()
      : false

    return new Response(
      JSON.stringify({
        connected: true,
        memberId: connection.linkedin_member_id,
        name: connection.name,
        email: connection.email,
        pictureUrl: connection.picture_url,
        headline: connection.headline,
        scopes: connection.scopes || [],
        connectedAt: connection.created_at,
        tokenExpired: isExpired,
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
