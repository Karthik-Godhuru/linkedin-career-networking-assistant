import type { CandidateRawInput } from '../../types/candidate'

interface GitHubUserItem {
  login: string
  id: number
  html_url: string
  type: string
}

interface GitHubUserDetail {
  login: string
  name: string | null
  company: string | null
  blog: string | null
  location: string | null
  bio: string | null
  html_url: string
}

/**
 * Discovers active AI/ML & Python developers via the public GitHub API.
 */
export async function searchGitHubDevelopers(params: {
  skills?: string[]
  location?: string
  limit?: number
}): Promise<CandidateRawInput[]> {
  const { skills = ['Python', 'PyTorch'], location, limit = 6 } = params

  const queryParts: string[] = ['type:user']
  if (skills.length > 0) {
    queryParts.push(skills.slice(0, 2).join('+'))
  }
  if (location && !location.toLowerCase().includes('remote')) {
    queryParts.push(`location:${location.split(',')[0].trim()}`)
  }

  const query = encodeURIComponent(queryParts.join(' '))
  const url = `https://api.github.com/search/users?q=${query}&per_page=${limit}&sort=followers`

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!res.ok) {
      return []
    }

    const data = await res.json()
    const items: GitHubUserItem[] = data.items || []

    const candidates: CandidateRawInput[] = []

    for (const item of items.slice(0, limit)) {
      // Fetch detailed public profile info
      try {
        const detailRes = await fetch(`https://api.github.com/users/${item.login}`, {
          headers: { Accept: 'application/vnd.github.v3+json' },
        })
        if (detailRes.ok) {
          const detail: GitHubUserDetail = await detailRes.json()
          const fullName = detail.name || detail.login
          const headline = detail.bio || `Open Source Contributor (${skills.join(', ')})`
          const linkedInOrBlog =
            detail.blog && detail.blog.includes('linkedin.com')
              ? detail.blog
              : `https://github.com/${detail.login}`

          candidates.push({
            full_name: fullName,
            headline: headline,
            current_company: detail.company ? detail.company.replace(/^@/, '') : 'Open Source Developer',
            location: detail.location || location || 'Worldwide',
            profile_url: linkedInOrBlog,
            source: 'github_search',
            category: 'engineer',
            skills: skills,
          })
        }
      } catch {
        // Continue with other users if single detail fetch fails
      }
    }

    return candidates
  } catch {
    return []
  }
}
