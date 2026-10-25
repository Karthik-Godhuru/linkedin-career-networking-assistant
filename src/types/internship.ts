import type { MatchReason } from './candidate'

export type InternshipStatus =
  | 'discovered'
  | 'bookmarked'
  | 'applied'
  | 'assessment'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn'

export type WorkMode = 'remote' | 'hybrid' | 'onsite'

export interface InternshipRawInput {
  title: string
  company: string
  location?: string
  work_mode?: WorkMode
  posting_url: string
  source: string
  required_skills?: string[]
  deadline?: string | null
  notes?: string | null
  description?: string | null
}

export interface InternshipRecord {
  id: string
  user_id: string
  title: string
  company: string
  location: string | null
  work_mode?: WorkMode
  posting_url: string
  source: string
  required_skills: string[]
  match_score: number | null
  match_reasons: MatchReason[]
  missing_skills: string[]
  status: InternshipStatus
  deadline: string | null
  applied_at: string | null
  interview_date?: string | null
  next_follow_up_date?: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

export interface InternshipStageConfig {
  id: InternshipStatus
  label: string
  shortLabel: string
  description: string
  color: string
  badgeColor: string
}

export const INTERNSHIP_STAGES: Record<InternshipStatus, InternshipStageConfig> = {
  discovered: {
    id: 'discovered',
    label: 'Discovered',
    shortLabel: 'Discovered',
    description: 'Found via public search or CSV import; needs review',
    color: 'text-slate-400',
    badgeColor: 'bg-slate-900 text-slate-300 border-slate-700',
  },
  bookmarked: {
    id: 'bookmarked',
    label: 'Interested / Saved',
    shortLabel: 'Saved',
    description: 'High match opportunity saved for application submission',
    color: 'text-blue-400',
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
  },
  applied: {
    id: 'applied',
    label: 'Application Submitted',
    shortLabel: 'Applied',
    description: 'Application officially submitted via career portal',
    color: 'text-amber-400',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
  },
  assessment: {
    id: 'assessment',
    label: 'Online Assessment / OA',
    shortLabel: 'Assessment',
    description: 'Coding challenge, take-home project or technical test received',
    color: 'text-purple-400',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
  },
  interviewing: {
    id: 'interviewing',
    label: 'Interviewing Stage',
    shortLabel: 'Interview',
    description: 'Recruiter screen, technical screen or behavioral round scheduled',
    color: 'text-emerald-400',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  },
  offered: {
    id: 'offered',
    label: 'Offer Received',
    shortLabel: 'Offer',
    description: 'Formal internship offer extended!',
    color: 'text-cyan-400',
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
  },
  rejected: {
    id: 'rejected',
    label: 'Declined / Not Selected',
    shortLabel: 'Declined',
    description: 'Application was not selected or role closed',
    color: 'text-rose-400',
    badgeColor: 'bg-rose-950 text-rose-300 border-rose-800',
  },
  withdrawn: {
    id: 'withdrawn',
    label: 'Withdrawn',
    shortLabel: 'Withdrawn',
    description: 'Application withdrawn by applicant',
    color: 'text-slate-500',
    badgeColor: 'bg-slate-950 text-slate-400 border-slate-800',
  },
}
