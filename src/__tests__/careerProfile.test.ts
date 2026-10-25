import { describe, it, expect } from 'vitest'
import {
  careerProfileSchema,
  ExperienceLevelEnum,
  type CareerProfileFormData,
} from '../types/profile'
import { extractErrorMessage } from '../hooks/useCareerProfile'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Milestone 2: Career Goals & Preferences Validation', () => {
  const validProfile: CareerProfileFormData = {
    target_roles: ['AI/ML Engineer', 'Python Developer'],
    target_companies: ['Google DeepMind', 'OpenAI', 'Anthropic'],
    target_skills: ['Python', 'PyTorch', 'React', 'FastAPI'],
    target_locations: ['Remote', 'Bengaluru'],
    alumni_institutions: ['XYZ University'],
    experience_level: 'student_intern',
    bio_summary: 'B.Tech CSE student specializing in AI/ML pipelines.',
  }

  it('validates a correct, complete career profile successfully', () => {
    const result = careerProfileSchema.safeParse(validProfile)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.target_roles).toHaveLength(2)
      expect(result.data.experience_level).toBe('student_intern')
    }
  })

  it('requires at least one target role', () => {
    const invalid = { ...validProfile, target_roles: [] }
    const result = careerProfileSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Specify at least one target role')
    }
  })

  it('requires at least one target company or startup', () => {
    const invalid = { ...validProfile, target_companies: [] }
    const result = careerProfileSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Specify at least one target company')
    }
  })

  it('requires at least one core technical skill', () => {
    const invalid = { ...validProfile, target_skills: [] }
    const result = careerProfileSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Specify at least one core technical skill')
    }
  })

  it('requires at least one target location', () => {
    const invalid = { ...validProfile, target_locations: [] }
    const result = careerProfileSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Specify at least one preferred location')
    }
  })

  it('rejects bio summaries longer than 800 characters', () => {
    const longBio = 'a'.repeat(801)
    const invalid = { ...validProfile, bio_summary: longBio }
    const result = careerProfileSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('800 characters or fewer')
    }
  })

  it('accepts all designated experience levels', () => {
    const levels = ['student_intern', 'entry_level', 'mid_level', 'senior', 'lead_founder'] as const
    for (const level of levels) {
      const parsed = ExperienceLevelEnum.safeParse(level)
      expect(parsed.success).toBe(true)
    }
  })

  it('verifies that the database migration contains matching columns for all profile fields', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/20261024000000_init_schema.sql'
    )
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')

    expect(sqlContent).toContain('target_roles TEXT[]')
    expect(sqlContent).toContain('target_companies TEXT[]')
    expect(sqlContent).toContain('target_skills TEXT[]')
    expect(sqlContent).toContain('target_locations TEXT[]')
    expect(sqlContent).toContain('alumni_institutions TEXT[]')
    expect(sqlContent).toContain('experience_level TEXT')
    expect(sqlContent).toContain('bio_summary TEXT')
    expect(sqlContent).toContain('UNIQUE')
  })

  it('verifies user isolation policies on user_career_profiles in migration SQL', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/20261024000000_init_schema.sql'
    )
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')

    expect(sqlContent).toContain('CREATE POLICY "Users can view own career profile"')
    expect(sqlContent).toContain('CREATE POLICY "Users can insert own career profile"')
    expect(sqlContent).toContain('CREATE POLICY "Users can update own career profile"')
    expect(sqlContent).toContain('WITH CHECK (auth.uid() = user_id)')
  })

  describe('extractErrorMessage helper', () => {
    it('extracts error from standard JavaScript Error instance', () => {
      const err = new Error('Network timeout')
      expect(extractErrorMessage(err, 'Fallback')).toBe('Network timeout')
    })

    it('extracts code and message from Supabase PostgrestError objects', () => {
      const postgrestErr = {
        code: '42501',
        message: 'permission denied for table user_career_profiles',
        details: null,
        hint: null,
      }
      expect(extractErrorMessage(postgrestErr, 'Fallback')).toBe(
        '[42501] permission denied for table user_career_profiles'
      )
    })

    it('returns details when message is empty', () => {
      const postgrestErr = {
        details: 'Detailed constraint violation info',
      }
      expect(extractErrorMessage(postgrestErr, 'Fallback')).toBe(
        'Detailed constraint violation info'
      )
    })

    it('returns fallback string when error is null or undefined', () => {
      expect(extractErrorMessage(null, 'Fallback')).toBe('Fallback')
      expect(extractErrorMessage(undefined, 'Fallback')).toBe('Fallback')
    })
  })
})
