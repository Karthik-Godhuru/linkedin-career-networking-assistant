-- Milestone 7: Grant table permissions on internships to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.internships
TO authenticated;

-- Milestone 7: Extend internship_status enum with assessment and withdrawn values
ALTER TYPE public.internship_status ADD VALUE IF NOT EXISTS 'assessment';
ALTER TYPE public.internship_status ADD VALUE IF NOT EXISTS 'withdrawn';
