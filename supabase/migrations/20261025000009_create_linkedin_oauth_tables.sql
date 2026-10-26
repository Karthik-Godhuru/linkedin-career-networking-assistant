-- Migration: Create tables for secure LinkedIn OAuth integration
-- Feature: LinkedIn OAuth 2.0, OpenID Connect Profile & Share on LinkedIn

-- 1. Create linkedin_oauth_states table
-- Stores cryptographically hashed state parameters for CSRF protection and single-use validation
CREATE TABLE IF NOT EXISTS public.linkedin_oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    state_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_oauth_states_hash ON public.linkedin_oauth_states(state_hash);
CREATE INDEX IF NOT EXISTS idx_linkedin_oauth_states_user_id ON public.linkedin_oauth_states(user_id);

-- 2. Create linkedin_connections table
-- Stores AES-GCM encrypted tokens (versioned envelope v1:<iv>:<ciphertext>) and verified member profile metadata bound to auth.users(id)
CREATE TABLE IF NOT EXISTS public.linkedin_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    linkedin_member_id TEXT NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    access_token_expires_at TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    name TEXT,
    email TEXT,
    picture_url TEXT,
    headline TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_connections_user_id ON public.linkedin_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_member_id ON public.linkedin_connections(linkedin_member_id);

-- 3. Revoke all direct client access (anon and authenticated)
-- Direct client access to linkedin_connections and linkedin_oauth_states is strictly prohibited.
-- All operations are routed through backend Supabase Edge Functions using service_role,
-- ensuring direct browser queries can never read encrypted token columns or tamper with state.
REVOKE ALL ON public.linkedin_oauth_states FROM anon, authenticated;
REVOKE ALL ON public.linkedin_connections FROM anon, authenticated;

-- 4. Enable Row Level Security (RLS) on both tables for defense-in-depth
ALTER TABLE public.linkedin_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;

-- 5. Helper function to clean up expired or consumed states
CREATE OR REPLACE FUNCTION public.cleanup_expired_linkedin_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.linkedin_oauth_states
    WHERE expires_at < NOW() OR (used = true AND created_at < NOW() - INTERVAL '1 hour');
END;
$$;
