import type { CandidateRecord } from './candidate'

export type TrackerStatus =
  | 'ready_to_send'
  | 'invitation_sent'
  | 'connected'
  | 'conversation_active'
  | 'follow_up_due'
  | 'relationship_established'
  | 'declined_or_inactive'

export interface NetworkingTrackerRecord {
  id?: string
  candidate_id: string
  user_id: string
  status: TrackerStatus
  invitation_sent_at: string | null
  connected_at: string | null
  next_follow_up_date: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

export interface PipelineCandidateItem {
  candidate: CandidateRecord
  tracker: NetworkingTrackerRecord
  isOverdue: boolean
  isDueToday: boolean
  daysUntilFollowUp: number | null
}

export interface StageConfig {
  id: TrackerStatus
  label: string
  description: string
  color: string
  badgeColor: string
}

export const STAGE_CONFIGS: Record<TrackerStatus, StageConfig> = {
  ready_to_send: {
    id: 'ready_to_send',
    label: 'Approved for Outreach',
    description: 'Candidate approved; connection note ready to send manually',
    color: 'text-blue-400',
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
  },
  invitation_sent: {
    id: 'invitation_sent',
    label: 'Invitation Sent',
    description: 'Connection note sent on LinkedIn; awaiting acceptance',
    color: 'text-amber-400',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
  },
  connected: {
    id: 'connected',
    label: 'Connection Accepted',
    description: 'Connected on LinkedIn; prepare 1st follow-up (+4 days)',
    color: 'text-emerald-400',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  },
  follow_up_due: {
    id: 'follow_up_due',
    label: 'Follow-Up Due',
    description: 'Spaced follow-up date has arrived; send 1st or final message',
    color: 'text-rose-400',
    badgeColor: 'bg-rose-950 text-rose-300 border-rose-800',
  },
  conversation_active: {
    id: 'conversation_active',
    label: 'Replied / Active Chat',
    description: 'Candidate replied; conversation ongoing',
    color: 'text-purple-400',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
  },
  relationship_established: {
    id: 'relationship_established',
    label: 'Relationship Established',
    description: 'Meaningful connection made; potential referral or mentorship',
    color: 'text-cyan-400',
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
  },
  declined_or_inactive: {
    id: 'declined_or_inactive',
    label: 'Not Interested / Closed',
    description: 'No response after final follow-up, or politely declined',
    color: 'text-slate-500',
    badgeColor: 'bg-slate-900 text-slate-400 border-slate-800',
  },
}
