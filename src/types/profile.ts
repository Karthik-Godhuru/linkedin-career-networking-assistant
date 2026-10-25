import { z } from 'zod'

export const ExperienceLevelEnum = z.enum([
  'student_intern',
  'entry_level',
  'mid_level',
  'senior',
  'lead_founder',
])

export type ExperienceLevel = z.infer<typeof ExperienceLevelEnum>

export const experienceLevelLabels: Record<ExperienceLevel, string> = {
  student_intern: 'Student / Internship Seeker',
  entry_level: 'Entry-Level / Early Career (0–2 yrs)',
  mid_level: 'Mid-Level Engineer (2–5 yrs)',
  senior: 'Senior Engineer (5+ yrs)',
  lead_founder: 'Tech Lead / Startup Founder',
}

export const careerProfileSchema = z.object({
  target_roles: z
    .array(z.string().min(1, 'Role cannot be empty').trim())
    .min(1, 'Specify at least one target role (e.g. AI/ML Engineer)'),
  target_companies: z
    .array(z.string().min(1, 'Company cannot be empty').trim())
    .min(1, 'Specify at least one target company or startup type'),
  target_skills: z
    .array(z.string().min(1, 'Skill cannot be empty').trim())
    .min(1, 'Specify at least one core technical skill (e.g. Python, PyTorch)'),
  target_locations: z
    .array(z.string().min(1, 'Location cannot be empty').trim())
    .min(1, 'Specify at least one preferred location or Remote'),
  alumni_institutions: z
    .array(z.string().min(1, 'Institution cannot be empty').trim())
    .default([]),
  experience_level: ExperienceLevelEnum.default('student_intern'),
  bio_summary: z
    .string()
    .max(800, 'Bio summary must be 800 characters or fewer')
    .nullable()
    .default(''),
})

export type CareerProfileFormData = z.infer<typeof careerProfileSchema>

export interface CareerProfileRecord extends CareerProfileFormData {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}

export const DEFAULT_SUGGESTED_ROLES = [
  'AI/ML Engineer',
  'Machine Learning Scientist',
  'Python Developer',
  'ML Systems Engineer',
  'Full Stack AI Engineer',
  'Data Scientist',
]

export const DEFAULT_SUGGESTED_SKILLS = [
  'Python',
  'PyTorch',
  'TensorFlow',
  'FastAPI',
  'React',
  'TypeScript',
  'Docker',
  'LangChain',
  'vLLM',
  'SQL',
]

export const DEFAULT_SUGGESTED_COMPANIES = [
  'OpenAI',
  'Anthropic',
  'Google DeepMind',
  'Hugging Face',
  'Scale AI',
  'Series A/B AI Startups',
]

export const DEFAULT_SUGGESTED_LOCATIONS = [
  'Remote (Worldwide)',
  'Remote (India)',
  'Bengaluru, India',
  'Hyderabad, India',
  'San Francisco, CA',
  'New York, NY',
]
