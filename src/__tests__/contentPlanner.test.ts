import { describe, it, expect } from 'vitest'
import {
  generateDeterministicPost,
  generatePostDraft,
} from '../services/contentGenerator'
import {
  getMondayOfWeek,
  getWeeklySlots,
  addDays,
  calculateEngagementRate,
  checkPublishingReminders,
  formatWeekRange,
  formatSlotDate,
} from '../utils/plannerUtils'
import {
  buildMediaSearchUrl,
  generateVisualSuggestions,
  PROVIDER_LICENSES,
} from '../services/visualMediaService'
import type { CareerProfileFormData } from '../types/profile'
import type {
  ContentPlanInput,
  ContentRecommendationRecord,
  ContentStatus,
  ContentTone,
} from '../types/contentPlanner'
import { CONTENT_STATUS_CONFIGS, TONE_OPTIONS } from '../types/contentPlanner'

const mockProfile: CareerProfileFormData = {
  target_roles: ['AI/ML Engineer', 'Python Backend Developer'],
  target_companies: ['Google', 'Anthropic'],
  target_skills: ['Python', 'PyTorch', 'FastAPI', 'Docker'],
  target_locations: ['Remote', 'San Francisco, CA'],
  alumni_institutions: ['University of Washington'],
  experience_level: 'entry_level',
  bio_summary: 'AI practitioner specializing in low-latency inference pipelines.',
}

describe('Content Planner: Post Generation & Anti-Slop Enforcement', () => {
  const tones: ContentTone[] = [
    'insightful_technical',
    'proof_benchmark',
    'teaching_snippet',
    'story_milestone',
    'quick_tip',
  ]

  it.each(tones)('generates authentic post for tone "%s" without em dashes or AI buzzwords', (tone) => {
    const input: ContentPlanInput = {
      topic: 'Asynchronous queue latency in PyTorch inference',
      suggested_angle: 'Reducing hot path latency',
      source_material: 'Benchmarked with 5,000 requests. Switching queues reduced p99 from 45ms to 12ms.',
      tone,
    }

    const result = generateDeterministicPost(input, mockProfile)

    expect(result.postBody).toBeTruthy()
    expect(result.generationMethod).toBe('deterministic_engine')

    // Anti-slop verification: No em dashes
    expect(result.postBody).not.toContain('—')

    // Anti-slop verification: No AI buzzwords
    const slopWords = ['delve', 'elevate', 'bespoke', 'seamless', 'tapestry', 'testament to', 'game-changer']
    for (const word of slopWords) {
      expect(result.postBody.toLowerCase()).not.toContain(word)
    }

    // High signal hashtags included
    expect(result.suggestedHashtags.length).toBeGreaterThan(0)
    expect(result.suggestedHashtags).toContain('#Python')
  })

  it('generates posts when source material is omitted', () => {
    const input: ContentPlanInput = {
      topic: 'Distributed caching strategies',
      tone: 'insightful_technical',
      suggested_angle: 'Cache invalidation architecture',
    }

    const result = generateDeterministicPost(input, mockProfile)
    expect(result.postBody).toContain('Distributed caching strategies')
    expect(result.postBody).toContain('AI/ML Engineer')
    expect(result.postBody).not.toContain('—')
  })

  it('generatePostDraft falls back gracefully to deterministic engine when proxy is unconfigured', async () => {
    const input: ContentPlanInput = {
      topic: 'Memory profiling with PyTorch CUDA allocator',
      tone: 'quick_tip',
      suggested_angle: 'CUDA memory spikes',
    }

    const result = await generatePostDraft(input, mockProfile)
    expect(result.generationMethod).toBe('deterministic_engine')
    expect(result.postBody).toBeTruthy()
    expect(result.postBody).not.toContain('—')
  })
})

describe('Content Planner: Weekly Calendar & Slot Calculations', () => {
  it('correctly calculates the Monday for any given reference date', () => {
    // 2026-10-25 is a Sunday -> Monday of that week was 2026-10-19
    const sunday = new Date(2026, 9, 25)
    expect(getMondayOfWeek(sunday)).toBe('2026-10-19')

    // 2026-10-27 is a Tuesday -> Monday is 2026-10-26
    const tuesday = new Date(2026, 9, 27)
    expect(getMondayOfWeek(tuesday)).toBe('2026-10-26')

    // 2026-10-26 is already Monday -> Monday is 2026-10-26
    const monday = new Date(2026, 9, 26)
    expect(getMondayOfWeek(monday)).toBe('2026-10-26')
  })

  it('returns exactly two planned slots per week: Slot 1 (Tuesday) and Slot 2 (Thursday)', () => {
    const monday = '2026-10-26'
    const slots = getWeeklySlots(monday)

    expect(slots).toHaveLength(2)

    // Slot 1 is Tuesday (Monday + 1 day = 2026-10-27)
    expect(slots[0].slotNumber).toBe(1)
    expect(slots[0].dayName).toBe('Tuesday')
    expect(slots[0].dateStr).toBe('2026-10-27')
    expect(slots[0].recommendedTime).toBe('08:30 AM')

    // Slot 2 is Thursday (Monday + 3 days = 2026-10-29)
    expect(slots[1].slotNumber).toBe(2)
    expect(slots[1].dayName).toBe('Thursday')
    expect(slots[1].dateStr).toBe('2026-10-29')
    expect(slots[1].recommendedTime).toBe('08:30 AM')
  })

  it('correctly shifts days with addDays', () => {
    expect(addDays('2026-10-26', 1)).toBe('2026-10-27')
    expect(addDays('2026-10-26', 7)).toBe('2026-11-02')
    expect(addDays('2026-10-26', -7)).toBe('2026-10-19')
  })

  it('formats dates and week ranges predictably', () => {
    const range = formatWeekRange('2026-10-26')
    expect(range).toContain('Oct 26')
    expect(range).toContain('2026')

    const slotLabel = formatSlotDate('2026-10-27')
    expect(slotLabel).toContain('Oct 27')
  })
})

describe('Content Planner: Engagement Metrics & Reminders', () => {
  it('accurately computes engagement rate percentage', () => {
    // 1,000 views, 50 reactions, 10 comments, 5 reposts -> 65 interactions -> 6.5%
    const rate = calculateEngagementRate(1000, 50, 10, 5)
    expect(rate).toBe(6.5)

    // Zero impressions -> 0%
    expect(calculateEngagementRate(0, 5, 2, 0)).toBe(0)

    // Edge case: rounds to two decimals
    const roundedRate = calculateEngagementRate(3333, 45, 12, 3)
    expect(roundedRate).toBe(1.8)
  })

  it('identifies in-app publishing reminders for due and overdue scheduled posts', () => {
    const today = '2026-10-27'
    const posts: ContentRecommendationRecord[] = [
      {
        id: 'post-today',
        user_id: 'user-1',
        topic: 'PyTorch v2.3 Migration',
        suggested_angle: 'Upgrade notes',
        suggested_hashtags: ['#Python'],
        target_audience: 'Engineers',
        draft_status: 'approved',
        post_body: 'Ready to post copy',
        source_material: null,
        tone: 'insightful_technical',
        scheduled_date: '2026-10-27',
        slot_number: 1,
        published_at: null,
        impressions: 0,
        reactions: 0,
        comments: 0,
        reposts: 0,
        created_at: '2026-10-20T00:00:00Z',
      },
      {
        id: 'post-overdue',
        user_id: 'user-1',
        topic: 'CUDA Profiling Tricks',
        suggested_angle: 'Profiling',
        suggested_hashtags: ['#PyTorch'],
        target_audience: 'Engineers',
        draft_status: 'draft',
        post_body: 'Draft body',
        source_material: null,
        tone: 'quick_tip',
        scheduled_date: '2026-10-22',
        slot_number: 2,
        published_at: null,
        impressions: 0,
        reactions: 0,
        comments: 0,
        reposts: 0,
        created_at: '2026-10-20T00:00:00Z',
      },
      {
        id: 'post-future',
        user_id: 'user-1',
        topic: 'Future Post',
        suggested_angle: 'Future',
        suggested_hashtags: [],
        target_audience: null,
        draft_status: 'approved',
        post_body: 'Upcoming post',
        source_material: null,
        tone: 'story_milestone',
        scheduled_date: '2026-10-29',
        slot_number: 2,
        published_at: null,
        impressions: 0,
        reactions: 0,
        comments: 0,
        reposts: 0,
        created_at: '2026-10-20T00:00:00Z',
      },
      {
        id: 'post-published',
        user_id: 'user-1',
        topic: 'Already Published',
        suggested_angle: 'Published',
        suggested_hashtags: [],
        target_audience: null,
        draft_status: 'published',
        post_body: 'Published body',
        source_material: null,
        tone: 'story_milestone',
        scheduled_date: '2026-10-27',
        slot_number: 1,
        published_at: '2026-10-27T08:35:00Z',
        impressions: 120,
        reactions: 10,
        comments: 2,
        reposts: 1,
        created_at: '2026-10-20T00:00:00Z',
      },
    ]

    const reminders = checkPublishingReminders(posts, today)

    // Should flag post-today (isToday: true) and post-overdue (isOverdue: true)
    // Should NOT flag post-future (scheduled in future) or post-published (already published)
    expect(reminders).toHaveLength(2)

    const todayReminder = reminders.find((r) => r.postId === 'post-today')
    expect(todayReminder).toBeDefined()
    expect(todayReminder?.isToday).toBe(true)
    expect(todayReminder?.isOverdue).toBe(false)

    const overdueReminder = reminders.find((r) => r.postId === 'post-overdue')
    expect(overdueReminder).toBeDefined()
    expect(overdueReminder?.isToday).toBe(false)
    expect(overdueReminder?.isOverdue).toBe(true)
  })
})

describe('Content Planner: Domain Types & Status Flow Integrity', () => {
  it('supports all 5 required post statuses with complete labels and badge colors', () => {
    const requiredStatuses: ContentStatus[] = ['idea', 'draft', 'approved', 'published', 'cancelled']

    for (const status of requiredStatuses) {
      const config = CONTENT_STATUS_CONFIGS[status]
      expect(config).toBeDefined()
      expect(config.label).toBeTruthy()
      expect(config.badgeColor).toBeTruthy()
      expect(config.description).toBeTruthy()
    }
  })

  it('supports all 5 tone options with actionable descriptions and examples', () => {
    expect(TONE_OPTIONS).toHaveLength(5)
    for (const opt of TONE_OPTIONS) {
      expect(opt.id).toBeTruthy()
      expect(opt.label).toBeTruthy()
      expect(opt.description).toBeTruthy()
      expect(opt.example).toBeTruthy()
    }
  })
})

describe('Content Planner: Visual Media Finder', () => {
  it('constructs safe and valid search URLs for Images (Pexels, Unsplash) and Videos (YouTube, Pexels Videos)', () => {
    const query = 'Python FastAPI Microservices'

    const pexelsUrl = buildMediaSearchUrl('pexels', query)
    expect(pexelsUrl).toBe('https://www.pexels.com/search/Python%20FastAPI%20Microservices/')

    const unsplashUrl = buildMediaSearchUrl('unsplash', query)
    expect(unsplashUrl).toBe('https://unsplash.com/s/photos/Python%20FastAPI%20Microservices')

    const youtubeUrl = buildMediaSearchUrl('youtube', query)
    expect(youtubeUrl).toBe('https://www.youtube.com/results?search_query=Python%20FastAPI%20Microservices')

    const pexelsVideosUrl = buildMediaSearchUrl('pexels_videos', query)
    expect(pexelsVideosUrl).toBe('https://www.pexels.com/search/videos/Python%20FastAPI%20Microservices/')
  })

  it('safely handles empty queries and whitespace with a sensible technology fallback', () => {
    const emptyPexels = buildMediaSearchUrl('pexels', '')
    expect(emptyPexels).toContain('https://www.pexels.com/search/')
    expect(emptyPexels).not.toContain('undefined')
    expect(emptyPexels).not.toContain('null')
    expect(emptyPexels).toContain('software%20engineering%20technology')

    const whitespaceYoutube = buildMediaSearchUrl('youtube', '   ')
    expect(whitespaceYoutube).toContain('https://www.youtube.com/results?search_query=')
    expect(whitespaceYoutube).toContain('software%20engineering%20technology')
  })

  it('generates rich visual suggestions tailored to technical topics and skills', () => {
    const suggestions = generateVisualSuggestions('PyTorch Model Optimization', ['Python', 'PyTorch'])

    expect(suggestions.length).toBeGreaterThanOrEqual(4)

    const categories = suggestions.map((s) => s.category)
    expect(categories).toContain('code')
    expect(categories).toContain('diagram')
    expect(categories).toContain('demo')
    expect(categories).toContain('photo')

    const codeSuggestion = suggestions.find((s) => s.category === 'code')
    expect(codeSuggestion?.query).toContain('Python')

    const diagramSuggestion = suggestions.find((s) => s.category === 'diagram')
    expect(diagramSuggestion?.query).toContain('architecture diagram')
  })

  it('provides complete licence guidance and official links for all supported providers', () => {
    const providers: ('pexels' | 'unsplash' | 'youtube' | 'pexels_videos')[] = [
      'pexels',
      'unsplash',
      'youtube',
      'pexels_videos',
    ]

    for (const provider of providers) {
      const guidance = PROVIDER_LICENSES[provider]
      expect(guidance).toBeDefined()
      expect(guidance.providerName).toBeTruthy()
      expect(guidance.commercialUse).toBeTruthy()
      expect(guidance.keyRules.length).toBeGreaterThan(0)
      expect(guidance.officialLicenseUrl).toMatch(/^https:\/\//)
    }
  })

  it('supports media_url and media_description on content records and inputs', () => {
    const record: ContentRecommendationRecord = {
      id: 'rec-1',
      user_id: 'user-1',
      topic: 'Scaling FastAPI',
      suggested_angle: 'Throughput optimization',
      suggested_hashtags: ['#Python'],
      target_audience: 'Developers',
      draft_status: 'draft',
      post_body: 'Optimizing async routes',
      source_material: null,
      tone: 'quick_tip',
      scheduled_date: '2026-10-27',
      slot_number: 1,
      published_at: null,
      impressions: 0,
      reactions: 0,
      comments: 0,
      reposts: 0,
      media_url: 'https://images.pexels.com/photos/123/code.jpg',
      media_description: 'FastAPI async benchmark dashboard screenshot',
      created_at: '2026-10-25T10:00:00Z',
    }

    expect(record.media_url).toBe('https://images.pexels.com/photos/123/code.jpg')
    expect(record.media_description).toContain('FastAPI async benchmark')
  })
})
