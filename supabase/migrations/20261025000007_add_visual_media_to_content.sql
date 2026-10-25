-- Migration: Add visual media columns to content_recommendations table
-- Feature: Visual Media Finder for Content Planner

ALTER TABLE public.content_recommendations
    ADD COLUMN IF NOT EXISTS media_url TEXT,
    ADD COLUMN IF NOT EXISTS media_description TEXT;
