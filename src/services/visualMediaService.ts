export type MediaTab = 'upload' | 'images' | 'videos'
export type ImageProvider = 'pexels' | 'unsplash'
export type VideoProvider = 'youtube' | 'pexels_videos'
export type MediaProvider = ImageProvider | VideoProvider

export interface VisualConceptSuggestion {
  id: string
  label: string
  query: string
  category: 'code' | 'diagram' | 'demo' | 'photo' | 'architecture'
  description: string
}

export interface LicenseGuidance {
  providerName: string
  commercialUse: 'Permitted' | 'Check Video/Creator License'
  attributionRequired: 'Not required, but appreciated' | 'Check individual video license'
  keyRules: string[]
  officialLicenseUrl: string
}

export const PROVIDER_LICENSES: Record<MediaProvider, LicenseGuidance> = {
  pexels: {
    providerName: 'Pexels Photos',
    commercialUse: 'Permitted',
    attributionRequired: 'Not required, but appreciated',
    keyRules: [
      'All photos are free to use for commercial and non-commercial purposes.',
      'Attribution is not required, giving credit to the photographer is appreciated.',
      'Identifiable people may not appear in a bad light or in a way that is offensive.',
      'Do not sell unaltered copies of a photo or poster.',
      'Do not imply endorsement of your product by people or brands on the imagery.',
    ],
    officialLicenseUrl: 'https://www.pexels.com/license/',
  },
  unsplash: {
    providerName: 'Unsplash Photos',
    commercialUse: 'Permitted',
    attributionRequired: 'Not required, but appreciated',
    keyRules: [
      'All photos can be downloaded and used for free for commercial and non-commercial purposes.',
      'No permission needed (though attribution is appreciated).',
      'Photos cannot be sold without significant modification.',
      'Compiling photos to replicate a similar or competing service is prohibited.',
      'Ensure no proprietary trademarks or identifiable private property are misrepresented.',
    ],
    officialLicenseUrl: 'https://unsplash.com/license',
  },
  youtube: {
    providerName: 'YouTube Videos',
    commercialUse: 'Check Video/Creator License',
    attributionRequired: 'Check individual video license',
    keyRules: [
      'Standard YouTube License reserves all rights to the creator; direct linking and embedding are allowed.',
      'For reusing video clips, filter for Creative Commons (CC BY) or request explicit permission.',
      'Always credit the original author and include the video link when discussing external work.',
      'Never download and re-upload another creator’s full video as your own native video.',
    ],
    officialLicenseUrl: 'https://www.youtube.com/static?template=terms',
  },
  pexels_videos: {
    providerName: 'Pexels Videos',
    commercialUse: 'Permitted',
    attributionRequired: 'Not required, but appreciated',
    keyRules: [
      'All videos are free to use for personal and commercial projects.',
      'Attribution is not mandatory, but giving credit is respectful.',
      'You can edit and modify the videos for your post or demo reels.',
      'Do not sell unedited copies of the video files.',
    ],
    officialLicenseUrl: 'https://www.pexels.com/license/',
  },
}

/**
 * Builds safe, sanitized search URLs for visual media providers.
 * If query is empty or blank, falls back to a relevant tech default.
 */
export function buildMediaSearchUrl(provider: MediaProvider, query: string): string {
  const trimmed = query.trim()
  const fallbackQuery = 'software engineering technology'
  const finalQuery = trimmed.length > 0 ? trimmed : fallbackQuery
  const encoded = encodeURIComponent(finalQuery)

  switch (provider) {
    case 'pexels':
      return `https://www.pexels.com/search/${encoded}/`
    case 'unsplash':
      return `https://unsplash.com/s/photos/${encoded}`
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${encoded}`
    case 'pexels_videos':
      return `https://www.pexels.com/search/videos/${encoded}/`
    default:
      return `https://www.google.com/search?q=${encoded}`
  }
}

/**
 * Generates curated, high-relevance visual search suggestions based on the post topic,
 * target skills, and content theme.
 */
export function generateVisualSuggestions(
  topic: string,
  targetSkills: string[] = []
): VisualConceptSuggestion[] {
  const cleanTopic = topic.trim()
  const primarySkill = targetSkills[0] || 'Python'
  const secondarySkill = targetSkills[1] || 'Machine Learning'

  const baseTopic = cleanTopic || `${primarySkill} engineering`

  return [
    {
      id: 'code_demo',
      label: 'Code Demonstration',
      query: `${primarySkill} code terminal programming`,
      category: 'code',
      description: 'Clean IDE or code editor screenshot illustrating an implementation pattern',
    },
    {
      id: 'ml_diagram',
      label: 'System Architecture Diagram',
      query: `${baseTopic} system architecture diagram workflow`,
      category: 'diagram',
      description: 'Technical flowcharts, pipeline architecture, or data schema visualization',
    },
    {
      id: 'project_demo',
      label: 'AI & Tech Project Demo',
      query: `${secondarySkill} technology demo project`,
      category: 'demo',
      description: 'Working interface demonstration, benchmark graph, or product walkthrough',
    },
    {
      id: 'tech_photo',
      label: 'Professional Tech Photography',
      query: 'software engineer workspace modern technology',
      category: 'photo',
      description: 'Authentic developer workstation, server hardware, or collaborative engineering',
    },
    {
      id: 'topic_specific',
      label: 'Topic Focused Search',
      query: baseTopic,
      category: 'architecture',
      description: `Direct visual query focused on "${baseTopic}"`,
    },
  ]
}
