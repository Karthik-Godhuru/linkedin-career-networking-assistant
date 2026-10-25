-- ==============================================================================
-- LinkedIn Career Networking Assistant - Initial Database Schema
-- Version: 1.0.0 (Milestone 1)
-- Compliance: RLS enforced; strictly scoped to authenticated user context
-- ==============================================================================

-- 1. Custom Enum Types
CREATE TYPE candidate_status AS ENUM (
    'pending',
    'approved',
    'dismissed',
    'archived'
);

CREATE TYPE candidate_category AS ENUM (
    'engineer',
    'recruiter',
    'founder',
    'alumni',
    'mentor'
);

CREATE TYPE tracker_status AS ENUM (
    'ready_to_send',
    'invitation_sent',
    'connected',
    'conversation_active',
    'follow_up_due',
    'declined_or_inactive'
);

CREATE TYPE internship_status AS ENUM (
    'discovered',
    'bookmarked',
    'applied',
    'interviewing',
    'offered',
    'rejected'
);

-- ==============================================================================
-- 2. Tables Definition
-- ==============================================================================

-- User Career Profiles (Milestone 2 Target)
CREATE TABLE IF NOT EXISTS public.user_career_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    target_roles TEXT[] NOT NULL DEFAULT '{}',
    target_companies TEXT[] NOT NULL DEFAULT '{}',
    target_skills TEXT[] NOT NULL DEFAULT '{}',
    target_locations TEXT[] NOT NULL DEFAULT '{}',
    alumni_institutions TEXT[] NOT NULL DEFAULT '{}',
    experience_level TEXT DEFAULT 'entry_to_mid',
    bio_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Discovered Candidates / Recommendations (Milestone 3 & 4 Target)
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    headline TEXT,
    current_company TEXT,
    location TEXT,
    profile_url TEXT NOT NULL,
    source TEXT NOT NULL, -- e.g. 'google_cse', 'github', 'csv_import'
    category candidate_category DEFAULT 'engineer',
    duplicate_hash TEXT NOT NULL, -- SHA256 of normalized profile_url
    match_score INT CHECK (match_score BETWEEN 0 AND 100),
    match_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,
    status candidate_status DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT candidates_user_hash_unique UNIQUE (user_id, duplicate_hash)
);

-- Personalized Connection Messages (Milestone 5 Target)
CREATE TABLE IF NOT EXISTS public.connection_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    draft_template TEXT NOT NULL,
    user_edited_text TEXT,
    character_count INT CHECK (character_count <= 300), -- Enforce LinkedIn 300 char note limit
    tone TEXT DEFAULT 'professional_warm',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Networking Pipeline Tracker (Milestone 6 Target)
CREATE TABLE IF NOT EXISTS public.networking_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status tracker_status DEFAULT 'ready_to_send',
    invitation_sent_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ,
    next_follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Internship Discovery & Tracking (Milestone 7 Target)
CREATE TABLE IF NOT EXISTS public.internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    posting_url TEXT NOT NULL,
    source TEXT NOT NULL,
    required_skills TEXT[] DEFAULT '{}',
    match_score INT CHECK (match_score BETWEEN 0 AND 100),
    match_reasons JSONB DEFAULT '[]'::JSONB,
    status internship_status DEFAULT 'discovered',
    deadline DATE,
    applied_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content Post Recommendations (Milestone 8 Target - Extensibility)
CREATE TABLE IF NOT EXISTS public.content_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    topic TEXT NOT NULL,
    suggested_angle TEXT NOT NULL,
    suggested_hashtags TEXT[] DEFAULT '{}',
    target_audience TEXT,
    draft_status TEXT DEFAULT 'idea',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. Performance Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_candidates_user_status ON public.candidates(user_id, status);
CREATE INDEX IF NOT EXISTS idx_candidates_dup_hash ON public.candidates(user_id, duplicate_hash);
CREATE INDEX IF NOT EXISTS idx_tracker_user_status ON public.networking_tracker(user_id, status);
CREATE INDEX IF NOT EXISTS idx_internships_user_status ON public.internships(user_id, status);

-- ==============================================================================
-- 4. Row Level Security (RLS) Policies
-- Enforce complete tenant isolation per authenticated Supabase user
-- ==============================================================================

ALTER TABLE public.user_career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networking_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_recommendations ENABLE ROW LEVEL SECURITY;

-- user_career_profiles
CREATE POLICY "Users can view own career profile"
    ON public.user_career_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career profile"
    ON public.user_career_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career profile"
    ON public.user_career_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own career profile"
    ON public.user_career_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- candidates
CREATE POLICY "Users can view own candidates"
    ON public.candidates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidates"
    ON public.candidates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidates"
    ON public.candidates FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own candidates"
    ON public.candidates FOR DELETE
    USING (auth.uid() = user_id);

-- connection_messages
CREATE POLICY "Users can manage own connection messages"
    ON public.connection_messages FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- networking_tracker
CREATE POLICY "Users can manage own networking tracker"
    ON public.networking_tracker FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- internships
CREATE POLICY "Users can manage own internships"
    ON public.internships FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- content_recommendations
CREATE POLICY "Users can manage own content recommendations"
    ON public.content_recommendations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
