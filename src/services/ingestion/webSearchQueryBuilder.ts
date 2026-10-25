import type { CareerProfileFormData } from '../../types/profile'

export interface WebSearchTemplate {
  title: string
  description: string
  query: string
  searchUrl: string
}

/**
 * Builds compliant Google Search URLs targeting publicly indexed technical profiles.
 * Does not scrape or automate requests; opens the clean search in a new tab for the user.
 */
export function buildWebSearchQueries(profile: CareerProfileFormData): WebSearchTemplate[] {
  const primaryRole = profile.target_roles[0] || 'AI/ML Engineer'
  const primarySkill = profile.target_skills[0] || 'Python'
  const secondarySkill = profile.target_skills[1] || 'PyTorch'
  const primaryCompany = profile.target_companies[0] || ''
  const location = profile.target_locations[0] && !profile.target_locations[0].toLowerCase().includes('remote')
    ? profile.target_locations[0]
    : ''

  const queries: WebSearchTemplate[] = [
    {
      title: 'Target Role & Key Skills Search',
      description: `Public profiles matching "${primaryRole}" with skills in ${primarySkill} and ${secondarySkill}`,
      query: `site:linkedin.com/in/ "${primaryRole}" "${primarySkill}" "${secondarySkill}"${location ? ` "${location}"` : ''}`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(
        `site:linkedin.com/in/ "${primaryRole}" "${primarySkill}" "${secondarySkill}"${location ? ` "${location}"` : ''}`
      )}`,
    },
    {
      title: 'Technical Recruiters & Talent Partners',
      description: `Find technical recruiters and campus talent leads hiring for ${primaryRole}`,
      query: `site:linkedin.com/in/ ("Technical Recruiter" OR "University Talent") ("${primaryRole}" OR "AI/ML")${location ? ` "${location}"` : ''}`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(
        `site:linkedin.com/in/ ("Technical Recruiter" OR "University Talent") ("${primaryRole}" OR "AI/ML")${location ? ` "${location}"` : ''}`
      )}`,
    },
  ]

  if (primaryCompany) {
    queries.push({
      title: 'Target Company Engineers',
      description: `Engineers working at ${primaryCompany}`,
      query: `site:linkedin.com/in/ "${primaryCompany}" ("${primaryRole}" OR "Software Engineer")`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(
        `site:linkedin.com/in/ "${primaryCompany}" ("${primaryRole}" OR "Software Engineer")`
      )}`,
    })
  }

  if (profile.alumni_institutions.length > 0) {
    const inst = profile.alumni_institutions[0]
    queries.push({
      title: 'Alumni Network Discovery',
      description: `Alumni from ${inst} working in AI/ML or engineering roles`,
      query: `site:linkedin.com/in/ "${inst}" ("${primaryRole}" OR "Machine Learning" OR "Python")`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(
        `site:linkedin.com/in/ "${inst}" ("${primaryRole}" OR "Machine Learning" OR "Python")`
      )}`,
    })
  }

  return queries
}
