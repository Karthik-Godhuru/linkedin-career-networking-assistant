-- Migration: Enhance content_recommendations table for Content Planner feature
-- Milestone: Content Planner & Weekly Scheduling

-- 1. Grant table permissions on content_recommendations to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.content_recommendations
TO authenticated;

-- 2. Add columns for post drafts, source material, scheduling, manual publishing, and metrics
ALTER TABLE public.content_recommendations
    ADD COLUMN IF NOT EXISTS post_body TEXT,
    ADD COLUMN IF NOT EXISTS source_material TEXT,
    ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'insightful_technical',
    ADD COLUMN IF NOT EXISTS scheduled_date DATE,
    ADD COLUMN IF NOT EXISTS slot_number INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS impressions INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reactions INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comments INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reposts INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
