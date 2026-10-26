-- Migration: Grant table privileges on LinkedIn OAuth tables to service_role
-- Feature: Secure Edge Function access to LinkedIn OAuth states & connections

-- 1. Grant table privileges to service_role for backend Edge Functions
GRANT ALL ON TABLE public.linkedin_oauth_states TO service_role;
GRANT ALL ON TABLE public.linkedin_connections TO service_role;

-- 2. Restrict cleanup function execution exclusively to service_role
REVOKE ALL ON FUNCTION public.cleanup_expired_linkedin_states()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_linkedin_states()
TO service_role;
