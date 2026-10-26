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

    // Delete connection
    const { error: deleteConnError } = await admin
      .from('linkedin_connections')
      .delete()
      .eq('user_id', user.id)

    if (deleteConnError) {
      return new Response(
        JSON.stringify({ error: `Failed to disconnect LinkedIn: ${deleteConnError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean up states for this user
    await admin
      .from('linkedin_oauth_states')
      .delete()
      .eq('user_id', user.id)

    return new Response(
      JSON.stringify({ success: true, message: 'LinkedIn account disconnected successfully' }),
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
