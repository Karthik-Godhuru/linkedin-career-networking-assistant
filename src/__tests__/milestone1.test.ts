import { describe, it, expect } from 'vitest'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Milestone 1: Project Scaffolding & Supabase Configuration', () => {
  it('instantiates Supabase client safely', () => {
    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
  })

  it('correctly reports configuration status without crashing', () => {
    const configured = isSupabaseConfigured()
    // In local dev without real keys, configured should return false rather than throwing
    expect(typeof configured).toBe('boolean')
  })

  it('has initial database migration file with all 6 required tables', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/20261024000000_init_schema.sql'
    )
    expect(fs.existsSync(migrationPath)).toBe(true)

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS public.user_career_profiles')
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS public.candidates')
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS public.connection_messages')
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS public.networking_tracker')
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS public.internships')
    expect(sqlContent).toContain('CREATE TABLE IF NOT EXISTS public.content_recommendations')
  })

  it('enforces Row Level Security (RLS) on all tables in the migration script', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/20261024000000_init_schema.sql'
    )
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')

    expect(sqlContent).toContain('ALTER TABLE public.user_career_profiles ENABLE ROW LEVEL SECURITY')
    expect(sqlContent).toContain('ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY')
    expect(sqlContent).toContain('ALTER TABLE public.connection_messages ENABLE ROW LEVEL SECURITY')
    expect(sqlContent).toContain('ALTER TABLE public.networking_tracker ENABLE ROW LEVEL SECURITY')
    expect(sqlContent).toContain('ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY')
    expect(sqlContent).toContain('ALTER TABLE public.content_recommendations ENABLE ROW LEVEL SECURITY')
  })

  it('enforces LinkedIn 300 character constraint on connection message drafts in schema', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/20261024000000_init_schema.sql'
    )
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')
    expect(sqlContent).toContain('CHECK (character_count <= 300)')
  })
})
