import type { ContentPlanInput, ContentTone } from '../types/contentPlanner'
import type { CareerProfileFormData } from '../types/profile'

export interface GeneratedPostResult {
  postBody: string
  suggestedHashtags: string[]
  suggestedAngle: string
  generationMethod: 'deterministic_engine' | 'server_proxy'
}

/**
 * Generates an authentic, high-signal LinkedIn post draft strictly adhering to
 * .agents/skills/li-plan and .agents/skills/li-human guidelines:
 * - High signal opening line (proof with a concrete number, architectural stance, or debugging lesson)
 * - Zero AI slop words (delve, elevate, bespoke, seamless, tapestry, etc.)
 * - Zero em dashes
 * - Engaging discussion prompt at the end
 * - Relevant technical hashtags
 */
export function generateDeterministicPost(
  input: ContentPlanInput,
  profile: CareerProfileFormData
): GeneratedPostResult {
  const topic = input.topic.trim()
  const source = (input.source_material || '').trim()
  const tone: ContentTone = input.tone || 'insightful_technical'
  const primaryRole = profile.target_roles[0] || 'AI/ML Engineer'
  const primarySkill = profile.target_skills[0] || 'Python'
  const secondarySkill = profile.target_skills[1] || 'PyTorch'

  let hook = ''
  let body = ''
  let question = ''
  let angle = input.suggested_angle || 'Technical implementation insight'

  switch (tone) {
    case 'proof_benchmark':
      angle = `Empirical benchmark and performance metrics on ${topic}`
      hook = `Most teams optimize ${topic} too late in the pipeline. We benchmarked it with concrete numbers.`
      body = source
        ? `Here is what happened during our testing:\n\n${source}\n\nKey finding: Bottlenecks rarely come from the model compute itself. They almost always trace back to serialization overhead and batch queue latency in ${primarySkill}.`
        : `During our recent evaluation runs using ${primarySkill} and ${secondarySkill}, throughput increased by over 35% simply by restructuring batch memory layout and asynchronous queue ingestion.\n\nKey lesson: Profile memory allocation before scaling compute instances.`;
      question = `What throughput optimizations made the biggest difference in your ${primarySkill} production pipelines?`
      break

    case 'teaching_snippet':
      angle = `Actionable code pattern or implementation trick for ${topic}`
      hook = `A small implementation pattern in ${primarySkill} that saves hours of silent debugging.`
      body = source
        ? `Here is the pattern we used for ${topic}:\n\n${source}\n\nWhy this matters: It provides explicit runtime validation without adding synchronous latency to hot inference loops.`
        : `When handling ${topic} in distributed workflows, naive exception catching masks critical timeout errors.\n\nInstead of blanket try/except blocks, define explicit schema boundaries with typed models. It turns runtime data drift into instant, catchable build warnings.`;
      question = `How do you structure runtime validation for distributed ${primarySkill} services?`
      break

    case 'story_milestone':
      angle = `Authentic debugging post-mortem on ${topic}`
      hook = `Spent 3 hours yesterday hunting a silent issue in ${topic}. The root cause was embarrassingly simple.`
      body = source
        ? `${source}\n\nWhat I learned: When debugging distributed systems, inspect data types and default arguments before touching architecture.`
        : `Everything passed local unit tests. But the moment batch size expanded under load, memory usage spiked unpredictably.\n\nTurns out, a mutable default parameter was retaining state across loop cycles in our data preparation script. One 2-line fix resolved the entire memory curve.`;
      question = `What is a recent debugging discovery that surprised your team?`
      break

    case 'quick_tip':
      angle = `Bite-sized best practice for ${primarySkill} developers`
      hook = `Quick rule of thumb for ${topic} that avoids costly refactors down the road.`
      body = source
        ? `${source}\n\nPractical takeaway: Keep services modular and decouple data ingestion from inference execution.`
        : `If your service handles ${topic}, never tie your payload ingestion schema directly to internal model tensors.\n\nMaintain an intermediate typed contract. When the underlying model or library updates, your public client contracts remain completely untouched.`;
      question = `Curious if other ${primaryRole}s follow this schema isolation pattern?`
      break

    case 'insightful_technical':
    default:
      angle = `Architectural analysis and trade-offs of ${topic}`
      hook = `The trade-offs between simplicity and performance when implementing ${topic}.`
      body = source
        ? `${source}\n\nArchitectural takeaway: Choosing the right abstraction matters far more than micro-optimizations.`
        : `In modern ${primaryRole} workflows, it is easy to reach for complex orchestration frameworks prematurely.\n\nFor 90% of pipelines, a clean, robust ${primarySkill} service with structured logging and proper concurrency primitives beats an over-engineered distributed cluster every single time.`;
      question = `Where do you draw the line between minimal script simplicity and full pipeline orchestration?`
      break
  }

  // Generate clean technical hashtags based on profile skills and topic
  const skillTags = profile.target_skills.slice(0, 3).map((s) => `#${s.replace(/[^a-zA-Z0-9]/g, '')}`)
  const generalTags = ['#SoftwareEngineering', '#MachineLearning', '#TechCareers']
  const combinedTags = Array.from(new Set([...skillTags, ...generalTags])).slice(0, 4)

  // Construct complete clean post body with zero em-dashes and no slop
  const rawPost = `${hook}\n\n${body}\n\n${question}\n\n${combinedTags.join(' ')}`
  const cleanedPost = sanitizePostText(rawPost)

  return {
    postBody: cleanedPost,
    suggestedHashtags: combinedTags,
    suggestedAngle: angle,
    generationMethod: 'deterministic_engine',
  }
}

/**
 * Generates an editable post draft.
 * If a secure server-side endpoint is configured, invokes it.
 * Otherwise, falls back to the transparent deterministic generator.
 */
export async function generatePostDraft(
  input: ContentPlanInput,
  profile: CareerProfileFormData,
  authToken?: string
): Promise<GeneratedPostResult> {
  const serverEndpoint = import.meta.env.VITE_AI_PROXY_ENDPOINT

  if (serverEndpoint && authToken) {
    try {
      const response = await fetch(serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          topic: input.topic,
          sourceMaterial: input.source_material,
          tone: input.tone,
          targetRole: profile.target_roles[0],
          targetSkills: profile.target_skills,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data && data.postBody) {
          return {
            postBody: sanitizePostText(data.postBody),
            suggestedHashtags: data.hashtags || [],
            suggestedAngle: data.angle || input.suggested_angle,
            generationMethod: 'server_proxy',
          }
        }
      }
    } catch {
      // Fallback to deterministic generator on proxy error
    }
  }

  return generateDeterministicPost(input, profile)
}

/**
 * Strips em-dashes and forbidden AI buzzwords per li-human guidelines.
 */
function sanitizePostText(text: string): string {
  let cleaned = text.replace(/—/g, ' - ')
  const slopWords = [
    /\bdelve into\b/gi,
    /\bdelve\b/gi,
    /\belevate\b/gi,
    /\bbespoke\b/gi,
    /\bseamless\b/gi,
    /\btapestry\b/gi,
    /\btestament to\b/gi,
    /\bgame-changer\b/gi,
    /\bunleash\b/gi,
  ]

  for (const wordRegex of slopWords) {
    cleaned = cleaned.replace(wordRegex, '')
  }

  // Clean up duplicate spaces
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ')
  return cleaned.trim()
}
