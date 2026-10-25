import type { CandidateRawInput, CandidateCategory, MatchReason } from '../types/candidate'
import type { CareerProfileFormData } from '../types/profile'

export interface MatchEvaluation {
  matchScore: number
  category: CandidateCategory
  matchReasons: MatchReason[]
}

/**
 * Categorizes a candidate based on title and headline keywords.
 */
export function categorizeCandidate(
  headline?: string,
  alumniMatch?: boolean
): CandidateCategory {
  if (!headline) return 'engineer'

  const text = headline.toLowerCase()

  if (alumniMatch) return 'alumni'
  if (text.includes('recruiter') || text.includes('talent') || text.includes('hiring') || text.includes('ta partner')) {
    return 'recruiter'
  }
  if (text.includes('founder') || text.includes('co-founder') || /\bceo\b/.test(text) || /\bcto\b/.test(text)) {
    return 'founder'
  }
  if (text.includes('mentor') || text.includes('advisor') || text.includes('fellow') || text.includes('director') || text.includes('vp')) {
    return 'mentor'
  }

  return 'engineer'
}

/**
 * Transparent relevance matching engine comparing candidate against user preferences.
 */
export function calculateRelevance(
  candidate: CandidateRawInput,
  userProfile: CareerProfileFormData
): MatchEvaluation {
  let score = 20 // baseline score for verified candidate
  const reasons: MatchReason[] = []

  const candHeadline = (candidate.headline || '').toLowerCase()
  const candCompany = (candidate.current_company || '').toLowerCase()
  const candLocation = (candidate.location || '').toLowerCase()
  const candSkills = (candidate.skills || []).map((s) => s.toLowerCase())

  // 1. Target Role Matching (Up to 30 points)
  for (const targetRole of userProfile.target_roles) {
    const roleLower = targetRole.toLowerCase()
    const roleKeywords = roleLower.split(/[\s/]+/)
    const hasMatch =
      candHeadline.includes(roleLower) ||
      roleKeywords.every((kw) => kw.length > 2 && candHeadline.includes(kw))

    if (hasMatch) {
      score += 30
      reasons.push({
        category: 'role',
        text: `Headline matches target role: "${targetRole}"`,
        weight: 30,
      })
      break
    }
  }

  // 2. Technical Skill Overlap (Up to 25 points)
  const matchedSkills: string[] = []
  for (const skill of userProfile.target_skills) {
    const skillLower = skill.toLowerCase()
    if (
      candHeadline.includes(skillLower) ||
      candSkills.includes(skillLower) ||
      (skillLower === 'python' && /\bpython\b/.test(candHeadline)) ||
      (skillLower === 'ml' && /\bml\b/.test(candHeadline)) ||
      (skillLower === 'ai' && /\bai\b/.test(candHeadline))
    ) {
      matchedSkills.push(skill)
    }
  }

  if (matchedSkills.length > 0) {
    const skillScore = Math.min(25, matchedSkills.length * 9)
    score += skillScore
    reasons.push({
      category: 'skill',
      text: `Technical overlap in ${matchedSkills.slice(0, 4).join(', ')}`,
      weight: skillScore,
    })
  }

  // 3. Target Company Alignment (Up to 20 points)
  for (const company of userProfile.target_companies) {
    const compLower = company.toLowerCase()
    if (candCompany.includes(compLower) || (compLower && candHeadline.includes(compLower))) {
      score += 20
      reasons.push({
        category: 'company',
        text: `Currently at target organization: "${company}"`,
        weight: 20,
      })
      break
    }
  }

  // 4. Preferred Location & Remote (Up to 15 points)
  for (const loc of userProfile.target_locations) {
    const locLower = loc.toLowerCase()
    if (locLower.includes('remote') && (candLocation.includes('remote') || candHeadline.includes('remote'))) {
      score += 15
      reasons.push({
        category: 'location',
        text: 'Supports remote / flexible collaboration',
        weight: 15,
      })
      break
    } else if (locLower && candLocation.includes(locLower)) {
      score += 15
      reasons.push({
        category: 'location',
        text: `Located in target hub: "${loc}"`,
        weight: 15,
      })
      break
    }
  }

  // 5. Alumni / Academic Affiliation (Up to 15 points)
  let alumniMatched = false
  for (const inst of userProfile.alumni_institutions) {
    const instLower = inst.toLowerCase()
    if (instLower && (candHeadline.includes(instLower) || (candidate.location || '').toLowerCase().includes(instLower))) {
      score += 15
      reasons.push({
        category: 'alumni',
        text: `Shared academic network: "${inst}"`,
        weight: 15,
      })
      alumniMatched = true
      break
    }
  }

  // Fallback reason if minimal direct matches
  if (reasons.length === 0) {
    reasons.push({
      category: 'general',
      text: 'Discovered in related technical community',
      weight: 10,
    })
  }

  const category = categorizeCandidate(candidate.headline, alumniMatched)
  const finalScore = Math.min(100, Math.max(10, score))

  return {
    matchScore: finalScore,
    category,
    matchReasons: reasons,
  }
}

/**
 * Optional Gemini AI enrichment: generates a nuanced connection angle
 * when VITE_GEMINI_API_KEY is supplied.
 */
export async function enrichWithGemini(
  candidate: CandidateRawInput,
  userProfile: CareerProfileFormData
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey || apiKey.includes('placeholder')) {
    return null
  }

  const prompt = `You are a career networking intelligence assistant.
Analyze this candidate for an AI/ML developer seeking career connections and internships.
Candidate: ${candidate.full_name}, ${candidate.headline || 'Engineer'} at ${candidate.current_company || 'Tech Company'}, Location: ${candidate.location || 'Unknown'}.
User target roles: ${userProfile.target_roles.join(', ')}.
User target skills: ${userProfile.target_skills.join(', ')}.

Provide one sentence explaining the most compelling mutual topic to discuss. Output plain text only, under 120 characters, with NO buzzwords and NO em dashes.`

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
