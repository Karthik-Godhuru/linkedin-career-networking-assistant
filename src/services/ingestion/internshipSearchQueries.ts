import type { CareerProfileFormData } from '../../types/profile'

export interface InternshipSearchTemplate {
  title: string
  description: string
  query: string
  searchUrl: string
  targetPlatform: string
}

/**
 * Builds compliant Google Search queries targeting public applicant tracking systems
 * (Greenhouse, Lever, Ashby, Workday) and corporate portals for internship opportunities.
 * Zero scraping; opens cleanly in Google Search in a user tab.
 */
export function buildInternshipSearchQueries(profile: CareerProfileFormData): InternshipSearchTemplate[] {
  const primaryRole = profile.target_roles[0] || 'AI/ML'
  const primarySkill = profile.target_skills[0] || 'Python'
  const primaryCompany = profile.target_companies[0] || ''
  const location = profile.target_locations[0] && !profile.target_locations[0].toLowerCase().includes('remote')
    ? profile.target_locations[0]
    : ''

  const templates: InternshipSearchTemplate[] = [
    {
      title: 'Greenhouse & Lever ATS Boards',
      description: `Target high-growth startups and tech firms hiring for "${primaryRole} Intern"`,
      targetPlatform: 'Greenhouse / Lever',
      query: `(site:boards.greenhouse.io OR site:jobs.lever.co) ("${primaryRole} Intern" OR "Machine Learning Intern" OR "AI Intern") "${primarySkill}"${location ? ` "${location}"` : ''}`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(
        `(site:boards.greenhouse.io OR site:jobs.lever.co) ("${primaryRole} Intern" OR "Machine Learning Intern" OR "AI Intern") "${primarySkill}"${location ? ` "${location}"` : ''}`
      )}`,
    },
    {
      title: 'Ashby & Modern Startup Portals',
      description: `Discover modern AI startups listing engineering and research internships`,
      targetPlatform: 'Ashby',
      query: `site:jobs.ashbyhq.com ("Intern" OR "Fellowship") ("${primaryRole}" OR "${primarySkill}" OR "Python")`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(
        `site:jobs.ashbyhq.com ("Intern" OR "Fellowship") ("${primaryRole}" OR "${primarySkill}" OR "Python")`
      )}`,
    },
    {
      title: 'Enterprise & Workday Portals',
      description: `Global tech firms & enterprise companies offering university graduate internships`,
      targetPlatform: 'Workday / Enterprise',
      query: `site:myworkdayjobs.com ("Intern" OR "Internship") ("${primaryRole}" OR "AI/ML" OR "Software Engineer")${location ? ` "${location}"` : ''}`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(
        `site:myworkdayjobs.com ("Intern" OR "Internship") ("${primaryRole}" OR "AI/ML" OR "Software Engineer")${location ? ` "${location}"` : ''}`
      )}`,
    },
  ]

  if (primaryCompany) {
    templates.push({
      title: `${primaryCompany} Official University Programs`,
      description: `Official campus recruiting and internship positions directly at ${primaryCompany}`,
      targetPlatform: primaryCompany,
      query: `site:careers.${primaryCompany.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com ("Intern" OR "University" OR "Campus") ("${primaryRole}" OR "Software")`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(
        `site:careers.${primaryCompany.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com ("Intern" OR "University" OR "Campus") ("${primaryRole}" OR "Software")`
      )}`,
    })
  }

  return templates
}
