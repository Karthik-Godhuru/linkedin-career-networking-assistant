export type ContentStatus = 'idea' | 'draft' | 'approved' | 'published' | 'cancelled'

export type ContentTone =
  | 'insightful_technical'
  | 'proof_benchmark'
  | 'teaching_snippet'
  | 'story_milestone'
  | 'quick_tip'

export interface ContentRecommendationRecord {
  id: string
  user_id: string
  topic: string
  suggested_angle: string
  suggested_hashtags: string[]
  target_audience: string | null
  draft_status: ContentStatus
  post_body: string | null
  source_material: string | null
  tone: ContentTone
  scheduled_date: string | null
  slot_number: number
  published_at: string | null
  impressions: number
  reactions: number
  comments: number
  reposts: number
  media_url?: string | null
  media_description?: string | null
  created_at: string
  updated_at?: string
}

export interface ContentPlanInput {
  id?: string
  topic: string
  suggested_angle: string
  source_material?: string
  post_body?: string
  suggested_hashtags?: string[]
  target_audience?: string
  tone?: ContentTone
  scheduled_date?: string | null
  slot_number?: number
  draft_status?: ContentStatus
  media_url?: string | null
  media_description?: string | null
}

export interface ContentStatusConfig {
  id: ContentStatus
  label: string
  color: string
  badgeColor: string
  description: string
}

export const CONTENT_STATUS_CONFIGS: Record<ContentStatus, ContentStatusConfig> = {
  idea: {
    id: 'idea',
    label: 'Idea',
    color: 'text-[#73685B]',
    badgeColor: 'bg-[#E8DFD3] text-[#73685B] border-[#D9CFC2]',
    description: 'Brainstormed topic or concept saved for future drafting',
  },
  draft: {
    id: 'draft',
    label: 'Draft',
    color: 'text-[#8A5A20]',
    badgeColor: 'bg-[#FBF4E8] text-[#8A5A20] border-[#E8D5B5]',
    description: 'Post draft generated and undergoing editing and refinement',
  },
  approved: {
    id: 'approved',
    label: 'Approved',
    color: 'text-[#2E5A36]',
    badgeColor: 'bg-[#EAF2EC] text-[#2E5A36] border-[#C6DEC9]',
    description: 'Approved copy ready for manual publishing on scheduled slot',
  },
  published: {
    id: 'published',
    label: 'Published',
    color: 'text-[#292722]',
    badgeColor: 'bg-[#292722] text-[#FAF7F2] border-[#292722]',
    description: 'Successfully published to LinkedIn manually; tracking engagement',
  },
  cancelled: {
    id: 'cancelled',
    label: 'Cancelled',
    color: 'text-[#942F2F]',
    badgeColor: 'bg-[#FCEEEE] text-[#942F2F] border-[#F0C4C4]',
    description: 'Post idea archived or removed from the active publishing schedule',
  },
}

export interface ToneOption {
  id: ContentTone
  label: string
  description: string
  example: string
}

export const TONE_OPTIONS: ToneOption[] = [
  {
    id: 'insightful_technical',
    label: 'Insightful Technical',
    description: 'Deep dive into an architectural choice, trade-off, or engineering pattern',
    example: 'Why we migrated from Celery to native asyncio for model inference queues...',
  },
  {
    id: 'proof_benchmark',
    label: 'Proof & Benchmark',
    description: 'Concrete numbers and findings from a test run, evaluation, or experiment',
    example: 'Benchmarking vLLM vs TGI on Llama 3: 42% throughput gain on FP8...',
  },
  {
    id: 'teaching_snippet',
    label: 'Teaching Snippet',
    description: 'Actionable code pattern or implementation trick for other engineers',
    example: 'Quick pattern for streaming token responses with Pydantic v2 schemas...',
  },
  {
    id: 'story_milestone',
    label: 'Story & Milestone',
    description: 'Authentic debugging post-mortem, project breakthrough, or learning curve',
    example: 'Spent 4 hours tracing a memory leak in our DataLoader. Here is what happened...',
  },
  {
    id: 'quick_tip',
    label: 'Quick Tip',
    description: 'Bite-sized best practice for Python, PyTorch, or systems engineering',
    example: 'Always pin your CUDA allocator settings when batching variable-length sequences...',
  },
]
