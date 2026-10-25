import type { InternshipRawInput, InternshipRecord, InternshipStatus, WorkMode } from '../types/internship'
import type { CareerProfileFormData } from '../types/profile'
import type { MatchReason } from '../types/candidate'
import { computeDuplicateHash, normalizeProfileUrl } from '../lib/hash'

export interface InternshipEvaluation {
  matchScore: number
  matchReasons: MatchReason[]
  missingSkills: string[]
}

/**
 * Normalizes internship posting URL and generates a duplicate SHA256 hash.
 */
export async function getInternshipDuplicateHash(url: string): Promise<string> {
  const normalized = normalizeProfileUrl(url)
  return computeDuplicateHash(normalized)
}

/**
 * Normalizes work mode based on location or explicit field.
 */
export function detectWorkMode(location?: string, rawMode?: WorkMode): WorkMode {
  if (rawMode) return rawMode
  if (!location) return 'onsite'
  const locLower = location.toLowerCase()
  if (locLower.includes('remote') || locLower.includes('anywhere') || locLower.includes('virtual')) {
    return 'remote'
  }
  if (locLower.includes('hybrid')) {
    return 'hybrid'
  }
  return 'onsite'
}

/**
 * Evaluates an internship opportunity against user's career preferences.
 * Produces a transparent 0-100 score, matching reasons, and identified missing skills.
 */
export function calculateInternshipRelevance(
  internship: InternshipRawInput,
  userProfile: CareerProfileFormData
): InternshipEvaluation {
  let score = 25 // Baseline score for verified technical internship
  const reasons: MatchReason[] = []

  const titleLower = internship.title.toLowerCase()
  const companyLower = internship.company.toLowerCase()
  const locationLower = (internship.location || '').toLowerCase()
  const workMode = detectWorkMode(internship.location, internship.work_mode)

  // 1. Target Role Matching (Up to 30 points)
  let roleMatched = false
  for (const targetRole of userProfile.target_roles) {
    const roleLower = targetRole.toLowerCase()
    const roleTokens = roleLower.split(/[\s/]+/).filter((t) => t.length > 2)

    const matchesAllTokens = roleTokens.length > 0 && roleTokens.every((token) => titleLower.includes(token))
    const isDirectMatch = titleLower.includes(roleLower)

    if (isDirectMatch || matchesAllTokens) {
      score += 30
      reasons.push({
        category: 'role',
        text: `Opportunity title matches target role: "${targetRole}"`,
        weight: 30,
      })
      roleMatched = true
      break
    }
  }

  // Fallback role check: check generic internship terms if no specific role matched
  if (!roleMatched && (titleLower.includes('intern') || titleLower.includes('fellow') || titleLower.includes('student'))) {
    score += 15
    reasons.push({
      category: 'role',
      text: 'Early-career internship opportunity aligned with development goals',
      weight: 15,
    })
  }

  // 2. Technical Skills Overlap & Missing Skills (Up to 30 points)
  const reqSkills = (internship.required_skills || []).map((s) => s.trim())
  const userSkillsLower = new Set(userProfile.target_skills.map((s) => s.toLowerCase()))

  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  if (reqSkills.length > 0) {
    for (const skill of reqSkills) {
      const sLower = skill.toLowerCase()
      // Check direct equality or substring inclusion
      const hasSkill = Array.from(userSkillsLower).some(
        (us) => us === sLower || us.includes(sLower) || sLower.includes(us)
      )

      if (hasSkill) {
        matchedSkills.push(skill)
      } else {
        missingSkills.push(skill)
      }
    }

    if (matchedSkills.length > 0) {
      const skillScore = Math.min(30, Math.round((matchedSkills.length / reqSkills.length) * 30))
      score += skillScore
      reasons.push({
        category: 'skill',
        text: `Matching requirements: ${matchedSkills.slice(0, 4).join(', ')}`,
        weight: skillScore,
      })
    }
  } else {
    // If no explicit skills listed on opportunity, check user skills against title & description
    for (const skill of userProfile.target_skills) {
      const sLower = skill.toLowerCase()
      if (titleLower.includes(sLower) || (internship.notes || '').toLowerCase().includes(sLower)) {
        matchedSkills.push(skill)
      }
    }
    if (matchedSkills.length > 0) {
      score += 20
      reasons.push({
        category: 'skill',
        text: `Skill keywords found in opportunity: ${matchedSkills.slice(0, 3).join(', ')}`,
        weight: 20,
      })
    }
  }

  // 3. Target Company Alignment (Up to 20 points)
  for (const company of userProfile.target_companies) {
    const compLower = company.toLowerCase()
    if (compLower && (companyLower.includes(compLower) || compLower.includes(companyLower))) {
      score += 20
      reasons.push({
        category: 'company',
        text: `Offered by target employer: "${company}"`,
        weight: 20,
      })
      break
    }
  }

  // 4. Preferred Location & Work Mode (Up to 15 points)
  let locMatched = false
  for (const loc of userProfile.target_locations) {
    const locLower = loc.toLowerCase()
    if (locLower.includes('remote') && (workMode === 'remote' || locationLower.includes('remote'))) {
      score += 15
      reasons.push({
        category: 'location',
        text: 'Remote work mode satisfies user location preferences',
        weight: 15,
      })
      locMatched = true
      break
    } else if (locLower && locationLower.includes(locLower)) {
      score += 15
      reasons.push({
        category: 'location',
        text: `Location matches preferred market: "${loc}"`,
        weight: 15,
      })
      locMatched = true
      break
    }
  }

  if (!locMatched && workMode === 'hybrid') {
    score += 5
    reasons.push({
      category: 'location',
      text: 'Hybrid opportunity with flexible arrangement',
      weight: 5,
    })
  }

  const finalScore = Math.min(100, Math.max(15, score))

  return {
    matchScore: finalScore,
    matchReasons: reasons,
    missingSkills,
  }
}

/**
 * Builds an InternshipRecord with evaluated match score, reasons, and missing skills.
 */
export function buildEvaluatedInternship(
  raw: InternshipRawInput,
  userId: string,
  userProfile: CareerProfileFormData,
  id: string = crypto.randomUUID()
): InternshipRecord {
  const evalResult = calculateInternshipRelevance(raw, userProfile)
  const workMode = detectWorkMode(raw.location, raw.work_mode)

  return {
    id,
    user_id: userId,
    title: raw.title.trim(),
    company: raw.company.trim(),
    location: raw.location ? raw.location.trim() : null,
    work_mode: workMode,
    posting_url: normalizeProfileUrl(raw.posting_url),
    source: raw.source,
    required_skills: raw.required_skills || [],
    match_score: evalResult.matchScore,
    match_reasons: evalResult.matchReasons,
    missing_skills: evalResult.missingSkills,
    status: (raw.deadline && new Date(raw.deadline) < new Date() ? 'discovered' : 'bookmarked') as InternshipStatus,
    deadline: raw.deadline || null,
    applied_at: null,
    interview_date: null,
    next_follow_up_date: null,
    notes: raw.notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Optional Gemini AI enrichment: generates an application highlight recommendation.
 */
export async function enrichInternshipWithGemini(
  internship: InternshipRecord,
  userProfile: CareerProfileFormData
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey || apiKey.includes('placeholder')) {
    return null
  }

  const prompt = `You are a technical career coach.
Analyze this internship for a student or developer:
Opportunity: ${internship.title} at ${internship.company}.
Required skills: ${internship.required_skills.join(', ') || 'General software engineering'}.
Missing candidate skills: ${internship.missing_skills.join(', ') || 'None'}.
User target skills: ${userProfile.target_skills.join(', ')}.

Provide one sentence recommending the single best project or technical topic for the candidate to highlight in their application.
Output plain text only, under 120 characters, with NO buzzwords and NO em dashes.`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    return text ? text.trim() : null
  } catch {
    return null
  }
}
