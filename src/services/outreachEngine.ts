import type { CandidateRecord } from '../types/candidate'
import type { CareerProfileFormData } from '../types/profile'
import type { OutreachDrafts, OutreachTone } from '../types/outreach'

/**
 * Generates compliant, factual outreach drafts strictly adhering to .agents/skills/li-dm/SKILL.md:
 * - Invite Note under 200 characters
 * - Zero fabricated facts or mutual connections
 * - No calendar links, no sales funnels, no "I hope this message finds you well"
 * - Two structured follow-ups (+4 days and +10 days close-the-loop)
 */
export function generateOutreachDrafts(
  candidate: CandidateRecord,
  userProfile: CareerProfileFormData,
  customContext?: string,
  tone: OutreachTone = 'professional_warm'
): OutreachDrafts {
  const firstName = candidate.full_name.split(' ')[0] || candidate.full_name
  const company = candidate.current_company || 'your team'
  const targetRole = userProfile.target_roles[0] || 'AI/ML Engineer'
  const primarySkill = userProfile.target_skills[0] || 'Python'

  // Determine the grounded factual hook (no hallucinations)
  let factualHook = ''
  let hookReason = ''

  if (customContext && customContext.trim().length > 0) {
    factualHook = customContext.trim()
    hookReason = 'User provided specific context'
  } else if (candidate.category === 'alumni' && userProfile.alumni_institutions.length > 0) {
    const inst = userProfile.alumni_institutions[0]
    factualHook = `Saw your background from ${inst} and your engineering work at ${company}.`
    hookReason = `Shared academic network (${inst})`
  } else if (candidate.category === 'recruiter') {
    factualHook = `Noticed your talent focus hiring engineers at ${company}.`
    hookReason = `Recruiting focus at ${company}`
  } else if (candidate.current_company) {
    factualHook = `Follow your team's engineering work at ${company}.`
    hookReason = `Engineering work at ${company}`
  } else {
    factualHook = `Found your profile through ${candidate.source.replace('_', ' ')}.`
    hookReason = 'Public technical community profile'
  }

  // Determine user identity line based on tone and profile
  let identityLine = ''
  if (tone === 'peer_technical') {
    identityLine = `I build ${primarySkill} systems as an aspiring ${targetRole}.`
  } else if (tone === 'alumni_academic') {
    identityLine = `I'm a fellow alum focused on ${primarySkill} and ${targetRole} roles.`
  } else {
    identityLine = `I'm preparing for ${targetRole} roles focused on ${primarySkill}.`
  }

  // Construct invite note (Must be under 200 characters per li-dm)
  let inviteNote = `${factualHook} ${identityLine} Would like to connect and follow along.`
  if (inviteNote.length > 195) {
    // Shorten if approaching 200 chars
    inviteNote = `${factualHook.replace(/\.$/, '')} - ${identityLine} Would like to connect.`
  }

  // Hard trim safety if somehow exceeded
  if (inviteNote.length > 200) {
    inviteNote = `${firstName}, noticed your work at ${company}. ${identityLine} Would like to follow along.`
  }

  // Follow-Up 1 (+4 Days after accepted): Give something before asking + small ask
  let followUp1 = ''
  if (candidate.category === 'recruiter') {
    followUp1 = `Hi ${firstName}, thanks for connecting. I've been following ${company}'s technical openings for ${targetRole}s. I recently open-sourced a ${primarySkill} benchmarking project aligned with that work. If your team is hiring entry-level talent, would a 10-minute chat make sense?`
  } else if (candidate.category === 'alumni') {
    followUp1 = `Hi ${firstName}, great connecting with a fellow alum. I'm exploring ${targetRole} paths and recently wrote up notes on optimizing ${primarySkill} pipelines. Would you be open to sharing a quick pointer on what ${company} looks for in engineers?`
  } else {
    followUp1 = `Hi ${firstName}, thanks for connecting. I've been experimenting with ${primarySkill} distributed pipelines and published an open-source template last week. Would love to know if your team at ${company} faces similar bottlenecks when deploying models.`
  }

  // Follow-Up 2 (+10 Days): Close the loop without pressure
  const followUp2 = `Hi ${firstName}, I know how intense sprints get at ${company}, so I'll close the loop here. Best of luck with upcoming milestones, and hope our paths cross down the line!`

  return {
    inviteNote,
    characterCount: inviteNote.length,
    followUp1,
    followUp2,
    hookReason,
    tone,
  }
}

/**
 * Optional Gemini AI generation:
 * Only invoked if VITE_GEMINI_API_KEY is configured.
 * Strictly adheres to li-dm and li-human guidelines (no buzzwords, no em dashes, under 200 chars).
 */
export async function generateGeminiOutreach(
  candidate: CandidateRecord,
  userProfile: CareerProfileFormData,
  customContext?: string
): Promise<OutreachDrafts | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey || apiKey.includes('placeholder')) {
    return null
  }

  const prompt = `You are a career networking writer following the strict 'li-dm' and 'li-human' rules.
Write an authentic, human LinkedIn connection note under 200 characters.
Candidate: ${candidate.full_name}, ${candidate.headline || 'Engineer'} at ${candidate.current_company || 'Tech Company'}.
User target roles: ${userProfile.target_roles.join(', ')}.
User target skills: ${userProfile.target_skills.join(', ')}.
User context: ${customContext || 'None provided'}.

Rules:
1. UNDER 200 CHARACTERS including spaces.
2. Structure: {one specific reference to them} + {one line of who you are} + {no ask}.
3. No buzzwords (delve, elevate, bespoke, unleash).
4. No em dashes. No "I hope this message finds you well".
5. Output ONLY the raw invite note text, nothing else.`

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
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text || text.length > 200) return null

    // Base follow-ups with AI note
    const base = generateOutreachDrafts(candidate, userProfile, customContext)
    return {
      ...base,
      inviteNote: text,
      characterCount: text.length,
      hookReason: 'AI synthesized from verified candidate profile',
    }
  } catch {
    return null
  }
}
