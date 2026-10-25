-- Milestone 4: Add 'shortlisted' value to candidate_status enum
-- Supports human approval workflow (Shortlist, Approve, Skip)
ALTER TYPE public.candidate_status ADD VALUE IF NOT EXISTS 'shortlisted';
